import { apiClient } from "./client";
import { sanitizeWebAuthnResponseForSecureAuthServer } from "../../modules/passkeys/lib/webauthn-response-privacy";
import type {
  PortableVaultGrantFinalizeResponse,
  PortableVaultGrantOptionsRequest,
  PortableVaultGrantOptionsResponse,
  PortableVaultGrantVerifyRequest,
  PortableVaultGrantVerifyResponse,
} from "../../modules/passkeys/lib/portable-vault-grant-types";

type BrowserPortableVaultGrantVerifyRequest<T extends object> =
  PortableVaultGrantVerifyRequest extends infer RequestVariant
    ? RequestVariant extends PortableVaultGrantVerifyRequest
      ? Omit<RequestVariant, "response"> & {
          response: T & { clientExtensionResults?: unknown };
        }
      : never
    : never;

export const passkeyPortableVaultGrantApi = {
  options: (input: PortableVaultGrantOptionsRequest) =>
    apiClient.post<PortableVaultGrantOptionsResponse>(
      "/api/account/passkeys/portable-vault-grants/options",
      input
    ),
  verify: <T extends object>(
    input: BrowserPortableVaultGrantVerifyRequest<T>
  ) =>
    apiClient.post<PortableVaultGrantVerifyResponse>(
      "/api/account/passkeys/portable-vault-grants/verify",
      {
        ...input,
        response: sanitizeWebAuthnResponseForSecureAuthServer(input.response),
      }
    ),
  finalizeReceipt: (receipt: string) =>
    apiClient.post<PortableVaultGrantFinalizeResponse>(
      "/api/account/passkeys/portable-vault-grants/finalize",
      { receipt }
    ),
};
