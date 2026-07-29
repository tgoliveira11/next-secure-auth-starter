import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

export const PORTABLE_VAULT_GRANT_PURPOSE = "portable_vault" as const;
export const PORTABLE_VAULT_GRANT_VERSION = 1 as const;

export type PortableVaultGrantAction = "unlock" | "enroll" | "revoke";

export type PortableVaultEphemeralPublicKeyJwk = {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
};

type PortableVaultGrantClaimsBaseV1 = {
  version: typeof PORTABLE_VAULT_GRANT_VERSION;
  iss: string;
  aud: string;
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  app_id: string;
  purpose: typeof PORTABLE_VAULT_GRANT_PURPOSE;
  credential_id: string;
  uv: true;
  auth_time: number;
  request_id: string;
};

export type PortableVaultGrantClaimsV1 = PortableVaultGrantClaimsBaseV1 &
  (
    | { action: "enroll" }
    | { action: "revoke"; envelope_id: string }
    | { action: "unlock"; envelope_id: string; epk_thumbprint: string }
  );

export type PortableVaultBrokerReceiptClaimsV1 = {
  iss: string;
  aud: string;
  app_id: string;
  sub: string;
  purpose: "portable_vault_completion";
  action: PortableVaultGrantAction;
  grant_jti: string;
  request_id: string;
  envelope_id: string;
  credential_id: string;
  jti: string;
  iat: number;
  exp: number;
  outcome: "completed";
};

type PortableVaultGrantOptionsRequestBase = {
  credentialDbId: string;
};

export type PortableVaultGrantOptionsRequest = PortableVaultGrantOptionsRequestBase &
  (
    | { action: "enroll" }
    | { action: "revoke"; envelopeId: string }
    | {
        action: "unlock";
        envelopeId: string;
        ephemeralPublicKeyJwk: PortableVaultEphemeralPublicKeyJwk;
      }
  );

export type PortableVaultGrantVerifyRequest = {
  requestId: string;
  response: unknown;
} & (
  | { action: "enroll" }
  | { action: "revoke"; envelopeId: string }
  | { action: "unlock"; envelopeId: string }
);

export type PortableVaultGrantOptionsResponse = {
  requestId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
};

export type PortableVaultGrantVerifyResponse = {
  requestId: string;
  verifiedCredentialId: string;
  grant: string;
  expiresAt: string;
};

type PortableVaultGrantFinalizeResponseBase = {
  requestId: string;
  credentialId: string;
  envelopeId: string;
  completed: true;
};

export type PortableVaultGrantFinalizeResponse = PortableVaultGrantFinalizeResponseBase &
  (
    | { action: "unlock" }
    | { action: "enroll"; vaultUnlockEnabled: true }
    | { action: "revoke"; vaultUnlockEnabled: false }
  );
