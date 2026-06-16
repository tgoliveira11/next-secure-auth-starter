import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import {
  getPasskeyLoginHint,
  passkeyLoginApi,
  prepareAuthenticationOptions,
  setPasskeyLoginHint,
  type PasskeyLoginHint,
} from "@tgoliveira/secure-auth/client";

export type PasskeyLoginOutcome = "signed-in" | "requires-two-factor" | "cancelled" | "unsupported";

export type SignInWithPasskeyOptions = {
  appSlug: string;
  loginPath?: string;
  afterLoginPath?: string;
  loginTwoFactorPath?: string;
};

export function buildPasskeyLoginOutcomeKey(appSlug: string): string {
  return `${appSlug}-passkey-login-outcome`;
}

export function getPasskeyLoginUnsupportedMessage(): string {
  return "This browser does not support passkey sign-in.";
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
): Promise<{
  outcome: PasskeyLoginOutcome;
  redirectTo: string;
}> {
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
    assertion = await startAuthentication({
      optionsJSON: prepareAuthenticationOptions(optionsResponse.options),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: loginPath };
    }
    throw error;
  }

  const verifyResult = await passkeyLoginApi.verify({ response: assertion });

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

  if (authResult?.error) {
    throw new Error("Passkey sign-in could not complete your session.");
  }

  sessionStorage.setItem(buildPasskeyLoginOutcomeKey(options.appSlug), "signed-in");
  return { outcome: "signed-in", redirectTo: afterLoginPath };
}
