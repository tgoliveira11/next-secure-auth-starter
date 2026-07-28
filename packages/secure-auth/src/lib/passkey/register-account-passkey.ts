import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { passkeyAccountApi } from "../api-client/passkey-account.js";
import { prepareRegistrationOptions } from "../../modules/passkeys/lib/prepare-webauthn-options.js";
import { releaseSensitiveClientExtensionResults } from "../../modules/passkeys/lib/webauthn-response-privacy.js";

export type AccountPasskeyRegistrationVerifiedContext = {
  /** Credential id returned by the browser. */
  registrationCredentialId: string;
  /** Exact credential id returned by successful secure-auth server verification. */
  verifiedCredentialId: string;
  /** Browser-only. The package never serializes this value after invoking the hook. */
  clientExtensionResults: RegistrationResponseJSON["clientExtensionResults"];
};

export type AccountPasskeyRegistrationHooks = {
  /**
   * Optional browser-option preparation. Use it to request extra browser extensions without adding
   * a package dependency. BufferSource extension inputs are preserved for SimpleWebAuthn.
   */
  prepareOptions?: (
    options: PublicKeyCredentialCreationOptionsJSON
  ) =>
    | PublicKeyCredentialCreationOptionsJSON
    | Promise<PublicKeyCredentialCreationOptionsJSON>;
  /**
   * Browser-only post-verification hook. Called only after exact credential-id equality is proven.
   * Never send `clientExtensionResults` to a server.
   */
  onVerified?: (context: AccountPasskeyRegistrationVerifiedContext) => void | Promise<void>;
};

export type RegisterAccountPasskeyResult = {
  verified: true;
  credentialId: string;
  integration:
    | { status: "not_configured" | "completed" }
    | { status: "failed"; error: unknown };
};

export async function registerAccountPasskey(input: {
  friendlyName?: string;
  hooks?: AccountPasskeyRegistrationHooks;
} = {}): Promise<RegisterAccountPasskeyResult> {
  const serverOptions = await passkeyAccountApi.registerOptions();
  const defaultOptions = prepareRegistrationOptions(serverOptions);
  const optionsJSON = input.hooks?.prepareOptions
    ? await input.hooks.prepareOptions(defaultOptions)
    : defaultOptions;
  const registration = await startRegistration({ optionsJSON });

  try {
    const verification = await passkeyAccountApi.registerVerify({
      response: registration,
      friendlyName: input.friendlyName,
    });

    if (!verification.verified || verification.credentialId !== registration.id) {
      throw new Error("Passkey registration credential verification mismatch");
    }

    if (!input.hooks?.onVerified) {
      return {
        verified: true,
        credentialId: verification.credentialId,
        integration: { status: "not_configured" },
      };
    }

    try {
      await input.hooks.onVerified({
        registrationCredentialId: registration.id,
        verifiedCredentialId: verification.credentialId,
        clientExtensionResults: registration.clientExtensionResults,
      });
      return {
        verified: true,
        credentialId: verification.credentialId,
        integration: { status: "completed" },
      };
    } catch (error) {
      return {
        verified: true,
        credentialId: verification.credentialId,
        integration: { status: "failed", error },
      };
    }
  } finally {
    releaseSensitiveClientExtensionResults(registration);
  }
}
