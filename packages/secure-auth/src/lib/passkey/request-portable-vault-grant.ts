import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyPortableVaultGrantApi } from "../api-client/passkey-portable-vault-grants.js";
import { prepareAuthenticationOptions } from "../../modules/passkeys/lib/prepare-webauthn-options.js";
import { releaseSensitiveClientExtensionResults } from "../../modules/passkeys/lib/webauthn-response-privacy.js";
import type {
  PortableVaultGrantOptionsRequest,
  PortableVaultGrantVerifyResponse,
} from "../../modules/passkeys/lib/portable-vault-grant-types.js";

/**
 * Runs a dedicated, UV-required WebAuthn proof for a portable vault broker grant.
 * The caller owns the non-extractable ephemeral private key; secure-auth receives only its public
 * JWK and never turns account login into vault authorization.
 */
export async function requestPortableVaultGrant(
  input: PortableVaultGrantOptionsRequest
): Promise<PortableVaultGrantVerifyResponse> {
  const { requestId, options } = await passkeyPortableVaultGrantApi.options(input);
  const assertion = await startAuthentication({
    optionsJSON: prepareAuthenticationOptions(options),
  });

  try {
    const result = await passkeyPortableVaultGrantApi.verify(
      input.action === "enroll"
        ? { requestId, action: "enroll", response: assertion }
        : { requestId, action: input.action, envelopeId: input.envelopeId, response: assertion }
    );
    if (result.requestId !== requestId || result.verifiedCredentialId !== assertion.id) {
      throw new Error("Portable vault grant credential verification mismatch");
    }
    return result;
  } finally {
    releaseSensitiveClientExtensionResults(assertion);
  }
}
