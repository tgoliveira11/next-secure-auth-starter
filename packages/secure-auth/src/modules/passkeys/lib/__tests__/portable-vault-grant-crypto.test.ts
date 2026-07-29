import { generateKeyPairSync } from "node:crypto";
import { CompactSign, compactVerify, importJWK } from "jose";
import { describe, expect, it } from "vitest";
import type {
  PortableVaultBrokerReceiptPublicJwk,
  PortableVaultGrantPrivateJwk,
  PortableVaultGrantsEnabledConfig,
} from "@/core/types";
import {
  createPortableVaultGrantJti,
  derivePortableVaultOpaqueSubjectId,
  hashPortableVaultOperationValue,
  normalizeAndThumbprintEphemeralPublicKey,
  PortableVaultGrantConfigurationError,
  PortableVaultGrantValidationError,
  requirePortableVaultGrantsConfig,
  signPortableVaultGrant,
  validatePortableVaultGrantsConfig,
  verifyPortableVaultBrokerReceipt,
} from "../portable-vault-grant-crypto";
import {
  PORTABLE_VAULT_GRANT_PURPOSE,
  PORTABLE_VAULT_GRANT_VERSION,
  type PortableVaultBrokerReceiptClaimsV1,
  type PortableVaultGrantClaimsV1,
} from "../portable-vault-grant-types";

function b64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createEcKeyPair(kid: string) {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    privateJwk: {
      ...pair.privateKey.export({ format: "jwk" }),
      kid,
      alg: "ES256",
    } as PortableVaultGrantPrivateJwk,
    publicJwk: {
      ...pair.publicKey.export({ format: "jwk" }),
      kid,
      alg: "ES256",
    } as PortableVaultBrokerReceiptPublicJwk,
  };
}

const authKeys = createEcKeyPair("auth-key-1");
const brokerKeys = createEcKeyPair("broker-key-1");

function buildConfig(
  overrides: Partial<PortableVaultGrantsEnabledConfig> = {}
): PortableVaultGrantsEnabledConfig {
  return {
    enabled: true,
    issuer: "https://auth.example.com",
    appId: "example-app",
    audience: "https://vault-broker.example.com",
    opaqueSubjectKey: Buffer.alloc(32, 7).toString("base64url"),
    ttlSeconds: 60,
    grantPrivateJwkB64: b64Json(authKeys.privateJwk),
    brokerReceiptIssuer: "https://vault-broker.example.com",
    brokerReceiptPublicJwksB64: b64Json([brokerKeys.publicJwk]),
    ...overrides,
  };
}

function configWrapper(config: { enabled?: boolean } | PortableVaultGrantsEnabledConfig) {
  return { webauthn: { portableVaultGrants: config } };
}

function buildGrantClaims(): PortableVaultGrantClaimsV1 {
  return {
    version: PORTABLE_VAULT_GRANT_VERSION,
    iss: "https://auth.example.com",
    aud: "https://vault-broker.example.com",
    sub: "247ac0fa-f0dd-4bb2-9f83-9055db6aef59",
    jti: "0b63d247-38c8-4999-a7bb-0803f7cbd151",
    iat: 1_800_000_000,
    exp: 1_800_000_060,
    app_id: "example-app",
    purpose: PORTABLE_VAULT_GRANT_PURPOSE,
    action: "unlock",
    credential_id: "credential-id-at-least-16",
    uv: true,
    auth_time: 1_800_000_000,
    request_id: "de305d54-75b4-431b-adb2-eb6b9e546014",
    envelope_id: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
    epk_thumbprint: "thumbprint-value-at-least-32-bytes-123",
  };
}

function buildReceiptClaims(
  overrides: Partial<PortableVaultBrokerReceiptClaimsV1> = {}
): PortableVaultBrokerReceiptClaimsV1 {
  return {
    iss: "https://vault-broker.example.com",
    aud: "https://auth.example.com",
    app_id: "example-app",
    sub: "247ac0fa-f0dd-4bb2-9f83-9055db6aef59",
    purpose: "portable_vault_completion",
    action: "enroll",
    grant_jti: "0b63d247-38c8-4999-a7bb-0803f7cbd151",
    request_id: "de305d54-75b4-431b-adb2-eb6b9e546014",
    envelope_id: "7dd12781-7a93-49bc-87fc-2fc076304ccc",
    credential_id: "credential-id-at-least-16",
    jti: "0f560c1d-2871-49bd-9e74-7afdbb8d3e77",
    iat: 1_800_000_000,
    exp: 1_800_000_120,
    outcome: "completed",
    ...overrides,
  };
}

async function signReceipt(
  claims: unknown,
  header: { alg: "ES256"; kid?: string; typ?: string } = {
    alg: "ES256",
    kid: "broker-key-1",
    typ: "JWT",
  },
  privateJwk: PortableVaultGrantPrivateJwk = brokerKeys.privateJwk
) {
  const key = await importJWK(privateJwk, "ES256");
  return new CompactSign(new TextEncoder().encode(JSON.stringify(claims)))
    .setProtectedHeader(header)
    .sign(key);
}

async function signRawReceipt(payload: string) {
  const key = await importJWK(brokerKeys.privateJwk, "ES256");
  return new CompactSign(new TextEncoder().encode(payload))
    .setProtectedHeader({ alg: "ES256", kid: "broker-key-1", typ: "JWT" })
    .sign(key);
}

describe("portable vault grant crypto", () => {
  it("accepts a disabled gate and validates a complete base64url ES256 JWK configuration", () => {
    expect(() => validatePortableVaultGrantsConfig(configWrapper({ enabled: false }))).not.toThrow();
    const config = buildConfig();
    expect(() => validatePortableVaultGrantsConfig(configWrapper(config))).not.toThrow();
    expect(() =>
      validatePortableVaultGrantsConfig(configWrapper(buildConfig({ ttlSeconds: undefined })))
    ).not.toThrow();
    expect(requirePortableVaultGrantsConfig(configWrapper(config))).toBe(config);
  });

  it("fails closed when the feature is disabled", () => {
    expect(() => requirePortableVaultGrantsConfig(configWrapper({ enabled: false }))).toThrow(
      expect.objectContaining({ name: "NotFoundError" })
    );
  });

  it.each([
    { issuer: "" },
    { issuer: "x".repeat(257) },
    { issuer: "not-a-url" },
    { appId: "INVALID APP" },
    { audience: "not-a-url" },
    { brokerReceiptIssuer: "not-a-url" },
    { ttlSeconds: 14 },
    { ttlSeconds: 121 },
    { opaqueSubjectKey: "not-canonical+base64" },
    { opaqueSubjectKey: Buffer.alloc(65, 1).toString("base64url") },
    { grantPrivateJwkB64: "" },
    { grantPrivateJwkB64: "{" },
    { brokerReceiptPublicJwksB64: b64Json([]) },
    {
      brokerReceiptPublicJwksB64: b64Json([
        { ...brokerKeys.publicJwk, kid: "same" },
        { ...brokerKeys.publicJwk, kid: "same" },
      ]),
    },
  ])("rejects invalid configuration %#", (overrides) => {
    expect(() =>
      validatePortableVaultGrantsConfig(
        configWrapper(buildConfig(overrides as Partial<PortableVaultGrantsEnabledConfig>))
      )
    ).toThrow(PortableVaultGrantConfigurationError);
  });

  it("rejects non-ES256 and private broker receipt keys", () => {
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const rsaPrivate = { ...rsa.privateKey.export({ format: "jwk" }), kid: "rsa" };
    expect(() =>
      validatePortableVaultGrantsConfig(
        configWrapper(buildConfig({ grantPrivateJwkB64: b64Json(rsaPrivate) }))
      )
    ).toThrow(PortableVaultGrantConfigurationError);
    expect(() =>
      validatePortableVaultGrantsConfig(
        configWrapper(
          buildConfig({ brokerReceiptPublicJwksB64: b64Json([brokerKeys.privateJwk]) })
        )
      )
    ).toThrow(PortableVaultGrantConfigurationError);
  });

  it("normalizes and RFC 7638-thumbprints an exact P-256 public JWK", () => {
    const jwk = {
      kty: "EC" as const,
      crv: "P-256" as const,
      x: authKeys.publicJwk.x,
      y: authKeys.publicJwk.y,
    };
    const first = normalizeAndThumbprintEphemeralPublicKey(jwk);
    const second = normalizeAndThumbprintEphemeralPublicKey({ ...jwk });
    expect(first.jwk).toEqual(jwk);
    expect(first.thumbprint).toBe(second.thumbprint);
    expect(first.thumbprint).toHaveLength(43);
  });

  it.each([
    null,
    { kty: "RSA", crv: "P-256", x: "x", y: "y" },
    { kty: "EC", crv: "P-256", x: "x", y: "y", d: "private" },
    { kty: "EC", crv: "P-256", x: "x", y: "y" },
    { kty: "EC", crv: "P-256", x: `${"A".repeat(42)}B`, y: "A".repeat(43) },
    { kty: "EC", crv: "P-256", x: "A".repeat(43), y: "A".repeat(43) },
  ])("rejects invalid or non-public ephemeral keys %#", (jwk) => {
    expect(() => normalizeAndThumbprintEphemeralPublicKey(jwk as never)).toThrow(
      PortableVaultGrantValidationError
    );
  });

  it("derives pairwise UUID subjects, hashes values, and creates UUID JTIs", () => {
    const config = buildConfig();
    const subject = derivePortableVaultOpaqueSubjectId(config, "user-1");
    expect(subject).toBe(derivePortableVaultOpaqueSubjectId(config, "user-1"));
    expect(subject).not.toBe(derivePortableVaultOpaqueSubjectId(config, "user-2"));
    expect(subject).toMatch(/^[0-9a-f-]{36}$/);
    expect(hashPortableVaultOperationValue("value")).toMatch(/^[a-f0-9]{64}$/);
    expect(createPortableVaultGrantJti()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("signs a verifiable ES256 grant with the configured key id", async () => {
    const compact = await signPortableVaultGrant(buildConfig(), buildGrantClaims());
    const key = await importJWK(authKeys.publicJwk, "ES256");
    const result = await compactVerify(compact, key, { algorithms: ["ES256"] });
    expect(result.protectedHeader).toEqual({ alg: "ES256", kid: "auth-key-1", typ: "JWT" });
    expect(JSON.parse(new TextDecoder().decode(result.payload))).toEqual(buildGrantClaims());
  });

  it("verifies an exact, short-lived, app-bound ES256 completion receipt", async () => {
    const claims = buildReceiptClaims();
    const receipt = await signReceipt(claims);
    await expect(
      verifyPortableVaultBrokerReceipt(buildConfig(), receipt, claims.iat + 1)
    ).resolves.toEqual(claims);
  });

  it.each([
    { iss: "https://wrong-broker.example.com" },
    { aud: "https://wrong-auth.example.com" },
    { app_id: "wrong-app" },
    { iat: 1_800_000_100, exp: 1_800_000_200 },
    { iat: 1_799_999_000, exp: 1_799_999_100 },
    { iat: 1_800_000_000, exp: 1_800_000_000 },
    { iat: 1_800_000_000, exp: 1_800_000_301 },
  ])("rejects receipt claim policy violation %#", async (overrides) => {
    const receipt = await signReceipt(buildReceiptClaims(overrides));
    await expect(
      verifyPortableVaultBrokerReceipt(buildConfig(), receipt, 1_800_000_000)
    ).rejects.toBeInstanceOf(PortableVaultGrantValidationError);
  });

  it("rejects malformed, unknown-key, wrong-header, wrong-signature, and non-strict receipts", async () => {
    const claims = buildReceiptClaims();
    const unknownKey = await signReceipt(claims, { alg: "ES256", kid: "unknown", typ: "JWT" });
    const missingKey = await signReceipt(claims, { alg: "ES256", typ: "JWT" });
    const wrongHeader = await signReceipt(claims, {
      alg: "ES256",
      kid: "broker-key-1",
      typ: "not-jwt",
    });
    const wrongSignature = await signReceipt(
      claims,
      { alg: "ES256", kid: "broker-key-1", typ: "JWT" },
      authKeys.privateJwk
    );
    const extraClaim = await signReceipt({ ...claims, unexpected: true });
    const invalidJson = await signRawReceipt("not-json");

    for (const receipt of [
      "not-a-jws",
      unknownKey,
      missingKey,
      wrongHeader,
      wrongSignature,
      extraClaim,
      invalidJson,
    ]) {
      await expect(
        verifyPortableVaultBrokerReceipt(buildConfig(), receipt, claims.iat + 1)
      ).rejects.toBeInstanceOf(PortableVaultGrantValidationError);
    }
  });

  it("rejects a receipt when configured public JWK JSON becomes unavailable", async () => {
    const claims = buildReceiptClaims();
    const receipt = await signReceipt(claims);
    await expect(
      verifyPortableVaultBrokerReceipt(
        buildConfig({ brokerReceiptPublicJwksB64: "invalid" }),
        receipt,
        claims.iat + 1
      )
    ).rejects.toBeInstanceOf(PortableVaultGrantValidationError);
  });
});
