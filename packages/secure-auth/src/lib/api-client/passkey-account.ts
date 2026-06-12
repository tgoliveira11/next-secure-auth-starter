import { apiClient } from "./client";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";

export type AccountPasskey = {
  id: string;
  friendlyName: string;
  createdAt: string;
  lastUsedAt: string | null;
  signInEnabled: boolean;
};

export const passkeyAccountApi = {
  list: () => apiClient.get<{ passkeys: AccountPasskey[] }>("/api/account/passkeys"),
  registerOptions: () =>
    apiClient.post<PublicKeyCredentialCreationOptionsJSON>("/api/account/passkeys/register", {
      action: "options",
    }),
  registerVerify: (payload: { response: unknown; friendlyName?: string }) =>
    apiClient.post<{ verified: boolean; credentialId: string }>(
      "/api/account/passkeys/register",
      { action: "verify", ...payload }
    ),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/account/passkeys/${id}`),
};