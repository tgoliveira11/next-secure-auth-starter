import {
  startAuthentication,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { passkeyLoginApi } from "../api-client/passkey-login.js";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  type PasskeyLoginHint,
} from "../../modules/passkeys/lib/login-hint.js";
import { prepareAuthenticationOptions } from "../../modules/passkeys/lib/prepare-webauthn-options.js";
import { releaseSensitiveClientExtensionResults } from "../../modules/passkeys/lib/webauthn-response-privacy.js";

export type PasskeyLoginOutcome =
  | "signed-in"
  | "signed-in-integration-action-required"
  | "signed-in-integration-failed"
  | "requires-two-factor"
  | "cancelled"
  | "unsupported";

export type FullyAuthenticatedPasskeyContext = {
  /** Exact credential id returned by successful secure-auth server verification. */
  verifiedCredentialId: string;
  /** Browser-only. Never send this value to a server. */
  clientExtensionResults: AuthenticationResponseJSON["clientExtensionResults"];
};

export type PasskeyLoginIntegrationCompletion =
  | { status: "completed" }
  | {
      status: "action_required";
      /** Consumer-owned stable code, for example `local_capability_unavailable`. */
      code: string;
      /** Same-app absolute path used instead of the normal post-login destination. */
      redirectTo: string;
      /** Optional user-facing explanation for custom consumers. */
      message?: string;
    };

export type PasskeyLoginIntegrationResult =
  | { status: "not_configured" | "completed" }
  | Extract<PasskeyLoginIntegrationCompletion, { status: "action_required" }>
  | { status: "failed"; error: unknown };

export type PasskeyLoginHooks = {
  /** Browser-option preparation before SimpleWebAuthn starts the ceremony; BufferSource is kept. */
  prepareOptions?: (
    options: PublicKeyCredentialRequestOptionsJSON
  ) => PublicKeyCredentialRequestOptionsJSON | Promise<PublicKeyCredentialRequestOptionsJSON>;
  /**
   * Runs only after WebAuthn verification and final account-session creation. It is never called
   * while TOTP is pending.
   */
  onFullyAuthenticated?: (
    context: FullyAuthenticatedPasskeyContext
  ) =>
    | void
    | PasskeyLoginIntegrationCompletion
    | Promise<void | PasskeyLoginIntegrationCompletion>;
};

export type SignInWithPasskeyOptions = {
  appSlug: string;
  loginPath?: string;
  afterLoginPath?: string;
  loginTwoFactorPath?: string;
  hooks?: PasskeyLoginHooks;
};

export type SignInWithPasskeyResult = {
  outcome: PasskeyLoginOutcome;
  redirectTo: string;
  integration?: PasskeyLoginIntegrationResult;
};

export function buildPasskeyLoginOutcomeKey(appSlug: string): string {
  return `${appSlug}-passkey-login-outcome`;
}

export function getPasskeyLoginUnsupportedMessage(): string {
  return "This browser does not support passkey sign-in.";
}

function isSameAppAbsolutePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\");
}

function resolveIntegrationCompletion(
  result: void | PasskeyLoginIntegrationCompletion
): PasskeyLoginIntegrationCompletion {
  if (result === undefined || result.status === "completed") {
    return { status: "completed" };
  }
  if (
    result.status !== "action_required" ||
    !result.code.trim() ||
    !isSameAppAbsolutePath(result.redirectTo)
  ) {
    throw new TypeError("Invalid passkey login integration result.");
  }
  return result;
}

export function isPasskeyLoginSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
  );
}

export function buildPasskeyLoginOptionsPayload(
  email?: string,
  hint?: PasskeyLoginHint | null
): { email: string } | { credentialId: string; userId?: string } | { userId: string } | undefined {
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return { email: trimmedEmail };
  if (hint?.credentialId) {
    return hint.userId
      ? { credentialId: hint.credentialId, userId: hint.userId }
      : { credentialId: hint.credentialId };
  }
  if (hint?.userId) return { userId: hint.userId };
  return undefined;
}

export async function signInWithPasskey(
  input: { email?: string } | undefined,
  options: SignInWithPasskeyOptions
): Promise<SignInWithPasskeyResult> {
  const loginPath = options.loginPath ?? "/login";
  const afterLoginPath = options.afterLoginPath ?? "/dashboard";
  const loginTwoFactorPath = options.loginTwoFactorPath ?? "/login/2fa?mode=credentials";

  if (!isPasskeyLoginSupported()) {
    return { outcome: "unsupported", redirectTo: loginPath };
  }

  const cachedHint = getPasskeyLoginHint(options.appSlug);
  const optionsPayload = buildPasskeyLoginOptionsPayload(input?.email, cachedHint);

  let optionsResponse;
  try {
    optionsResponse = await passkeyLoginApi.options(optionsPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: loginPath };
    }
    throw error;
  }

  let assertion;
  try {
    const defaultOptions = prepareAuthenticationOptions(optionsResponse.options);
    const optionsJSON = options.hooks?.prepareOptions
      ? await options.hooks.prepareOptions(defaultOptions)
      : defaultOptions;
    assertion = await startAuthentication({ optionsJSON });
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: loginPath };
    }
    throw error;
  }

  try {
    const verifyResult = await passkeyLoginApi.verify({ response: assertion });

    if (verifyResult.credentialId !== assertion.id) {
      throw new Error("Passkey authentication credential verification mismatch");
    }

    setPasskeyLoginHint(options.appSlug, {
      userId: verifyResult.userId,
      credentialId: verifyResult.credentialId ?? assertion.id,
    });

    if (verifyResult.requiresTwoFactor) {
      return { outcome: "requires-two-factor", redirectTo: loginTwoFactorPath };
    }

    const authResult = await signIn("login-token", {
      loginToken: verifyResult.loginToken,
      redirect: false,
    });

    if (authResult?.ok !== true || authResult.error) {
      throw new Error("Passkey sign-in could not complete your session.");
    }

    sessionStorage.setItem(buildPasskeyLoginOutcomeKey(options.appSlug), "signed-in");

    if (!options.hooks?.onFullyAuthenticated) {
      return {
        outcome: "signed-in",
        redirectTo: afterLoginPath,
        integration: { status: "not_configured" },
      };
    }

    try {
      const integration = resolveIntegrationCompletion(
        await options.hooks.onFullyAuthenticated({
          verifiedCredentialId: verifyResult.credentialId,
          clientExtensionResults: assertion.clientExtensionResults,
        })
      );
      if (integration.status === "action_required") {
        return {
          outcome: "signed-in-integration-action-required",
          redirectTo: integration.redirectTo,
          integration,
        };
      }
      return {
        outcome: "signed-in",
        redirectTo: afterLoginPath,
        integration,
      };
    } catch (error) {
      return {
        outcome: "signed-in-integration-failed",
        redirectTo: afterLoginPath,
        integration: { status: "failed", error },
      };
    }
  } finally {
    releaseSensitiveClientExtensionResults(assertion);
  }
}
