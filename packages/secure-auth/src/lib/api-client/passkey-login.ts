import { apiClient } from "./client";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

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
  verify: (payload: { response: unknown }) =>
    apiClient.post<PasskeyLoginVerifyResult>("/api/auth/passkey/login/verify", payload),
};