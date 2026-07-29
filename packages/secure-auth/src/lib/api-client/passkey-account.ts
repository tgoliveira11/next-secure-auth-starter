import { apiClient } from "./client";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { sanitizeWebAuthnResponseForSecureAuthServer } from "../../modules/passkeys/lib/webauthn-response-privacy";

export type AccountPasskeyCapabilities = {
  signIn: boolean;
  vaultUnlock: boolean;
};

export type AccountPasskey = {
  id: string;
  credentialId: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt: string | null;
  signInEnabled: boolean;
  vaultUnlockEnabled: boolean;
  capabilities: AccountPasskeyCapabilities;
  removableFromAccountSettings: boolean;
  label: string;
  description: string;
  badge: string | null;
};

export const passkeyAccountApi = {
  list: () => apiClient.get<{ passkeys: AccountPasskey[] }>("/api/account/passkeys"),
  registerOptions: () =>
    apiClient.post<PublicKeyCredentialCreationOptionsJSON>("/api/account/passkeys/register", {
      action: "options",
    }),
  registerVerify: <T extends object>(payload: {
    response: T & { clientExtensionResults?: unknown };
    friendlyName?: string;
  }) =>
    apiClient.post<{ verified: boolean; credentialId: string }>(
      "/api/account/passkeys/register",
      {
        action: "verify",
        ...payload,
        response: sanitizeWebAuthnResponseForSecureAuthServer(payload.response),
      }
    ),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/account/passkeys/${id}`),
  enableSignInOptions: (id: string) =>
    apiClient.post<{ options: PublicKeyCredentialRequestOptionsJSON }>(
      `/api/account/passkeys/${id}/enable-sign-in`,
      { action: "options" }
    ),
  enableSignInVerify: <T extends object>(
    id: string,
    payload: { response: T & { clientExtensionResults?: unknown } }
  ) =>
    apiClient.post<{ verified: true; credentialId: string; signInEnabled: true }>(
      `/api/account/passkeys/${id}/enable-sign-in`,
      {
        action: "verify",
        response: sanitizeWebAuthnResponseForSecureAuthServer(payload.response),
      }
    ),
};
