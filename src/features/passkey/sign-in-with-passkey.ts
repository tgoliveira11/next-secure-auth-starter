import { startAuthentication } from "@simplewebauthn/browser";
import { signIn } from "next-auth/react";
import { passkeyLoginApi } from "@/lib/api-client/passkey-login";
import { prepareAuthenticationOptions } from "@/lib/passkey/prepare-webauthn-options";
import {
  getPasskeyLoginHint,
  setPasskeyLoginHint,
  type PasskeyLoginHint,
} from "@/lib/passkey/login-hint";
import { APP_SLUG } from "@/lib/brand";

export const PASSKEY_LOGIN_OUTCOME_KEY = `${APP_SLUG}-passkey-login-outcome`;

export type PasskeyLoginOutcome = "signed-in" | "cancelled" | "unsupported";

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

export async function signInWithPasskey(input?: { email?: string }): Promise<{
  outcome: PasskeyLoginOutcome;
  redirectTo: string;
}> {
  if (!isPasskeyLoginSupported()) {
    return { outcome: "unsupported", redirectTo: "/login" };
  }

  const cachedHint = getPasskeyLoginHint();
  const optionsPayload = buildPasskeyLoginOptionsPayload(input?.email, cachedHint);

  let optionsResponse;
  try {
    optionsResponse = await passkeyLoginApi.options(optionsPayload);
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") {
      return { outcome: "cancelled", redirectTo: "/login" };
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
      return { outcome: "cancelled", redirectTo: "/login" };
    }
    throw error;
  }

  const verifyResult = await passkeyLoginApi.verify({ response: assertion });

  setPasskeyLoginHint({
    userId: verifyResult.userId,
    credentialId: verifyResult.credentialId ?? assertion.id,
  });

  const authResult = await signIn("login-token", {
    loginToken: verifyResult.loginToken,
    redirect: false,
  });

  if (authResult?.error) {
    throw new Error("Passkey sign-in could not complete your session.");
  }

  sessionStorage.setItem(PASSKEY_LOGIN_OUTCOME_KEY, "signed-in");
  return { outcome: "signed-in", redirectTo: "/dashboard" };
}
