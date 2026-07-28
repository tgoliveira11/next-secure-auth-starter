import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyAccountApi } from "../api-client/passkey-account.js";
import { prepareAuthenticationOptions } from "../../modules/passkeys/lib/prepare-webauthn-options.js";
import { releaseSensitiveClientExtensionResults } from "../../modules/passkeys/lib/webauthn-response-privacy.js";

/**
 * Proves possession of an existing vault-only credential and enables account sign-in on the same
 * credential. The server owns the separate challenge audience and the capability update.
 */
export async function enableAccountPasskeySignIn(credentialDbId: string): Promise<{
  verified: true;
  credentialId: string;
  signInEnabled: true;
}> {
  const { options } = await passkeyAccountApi.enableSignInOptions(credentialDbId);
  const assertion = await startAuthentication({
    optionsJSON: prepareAuthenticationOptions(options),
  });

  try {
    const verification = await passkeyAccountApi.enableSignInVerify(credentialDbId, {
      response: assertion,
    });

    if (!verification.verified || verification.credentialId !== assertion.id) {
      throw new Error("Passkey capability credential verification mismatch");
    }

    return verification;
  } finally {
    // This ceremony does not request PRF today. Cleanup remains generic defense-in-depth if its
    // browser options gain extension results in the future.
    releaseSensitiveClientExtensionResults(assertion);
  }
}
