import { apiClient } from "./client";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { sanitizeWebAuthnResponseForSecureAuthServer } from "../../modules/passkeys/lib/webauthn-response-privacy";

export type PasskeyLoginVerifyResult =
  | {
      requiresTwoFactor: false;
      loginToken: string;
      userId: string;
      credentialId: string;
    }
  | {
      requiresTwoFactor: true;
      challengeToken: string;
      userId: string;
      credentialId: string;
    };

export const passkeyLoginApi = {
  options: (payload?: { email?: string; userId?: string; credentialId?: string }) =>
    apiClient.post<{ options: PublicKeyCredentialRequestOptionsJSON }>(
      "/api/auth/passkey/login/options",
      payload ?? {}
    ),
  verify: <T extends object>(payload: {
    response: T & { clientExtensionResults?: unknown };
  }) =>
    apiClient.post<PasskeyLoginVerifyResult>("/api/auth/passkey/login/verify", {
      response: sanitizeWebAuthnResponseForSecureAuthServer(payload.response),
    }),
};
