import "server-only";
import {
  createHash,
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomUUID,
} from "node:crypto";
import {
  CompactSign,
  compactVerify,
  decodeProtectedHeader,
  importJWK,
} from "jose";
import { z } from "zod";
import type {
  PortableVaultBrokerReceiptPublicJwk,
  PortableVaultGrantPrivateJwk,
  PortableVaultGrantsEnabledConfig,
} from "@/core/types";
import {
  PORTABLE_VAULT_GRANT_PURPOSE,
  type PortableVaultBrokerReceiptClaimsV1,
  type PortableVaultEphemeralPublicKeyJwk,
  type PortableVaultGrantClaimsV1,
} from "./portable-vault-grant-types";

const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;
const CLOCK_SKEW_SECONDS = 30;
const MAX_RECEIPT_TTL_SECONDS = 5 * 60;
const MAX_JWK_JSON_BYTES = 32 * 1024;

const publicJwkSchema = z
  .object({
    kty: z.literal("EC"),
    crv: z.literal("P-256"),
    x: z.string().regex(BASE64URL_32_BYTES),
    y: z.string().regex(BASE64URL_32_BYTES),
    kid: z.string().min(1).max(128),
    alg: z.literal("ES256").optional(),
    use: z.literal("sig").optional(),
    d: z.never().optional(),
  })
  .strict();

const privateJwkSchema = publicJwkSchema
  .omit({ d: true })
  .extend({ d: z.string().regex(BASE64URL_32_BYTES) })
  .strict();

const receiptPublicJwksSchema = z.array(publicJwkSchema).min(1).max(10);

const receiptClaimsSchema = z
  .object({
    iss: z.string().url().max(256),
    aud: z.string().url().max(256),
    app_id: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
    sub: z.string().uuid(),
    purpose: z.literal("portable_vault_completion"),
    action: z.enum(["unlock", "enroll", "revoke"]),
    grant_jti: z.string().uuid(),
    request_id: z.string().uuid(),
    envelope_id: z.string().uuid(),
    credential_id: z.string().min(16).max(2048),
    jti: z.string().uuid(),
    iat: z.number().int().nonnegative(),
    exp: z.number().int().positive(),
    outcome: z.literal("completed"),
  })
  .strict();

export class PortableVaultGrantConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortableVaultGrantConfigurationError";
  }
}

export class PortableVaultGrantValidationError extends Error {
  constructor(message = "Portable vault proof is invalid or expired") {
    super(message);
    this.name = "ValidationError";
  }
}

function decodeBase64UrlJson(value: string): unknown {
  if (!value || value.length > MAX_JWK_JSON_BYTES * 2) throw new Error("invalid JWK input");
  const bytes = Buffer.from(value, "base64url");
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > MAX_JWK_JSON_BYTES ||
    bytes.toString("base64url") !== value
  ) {
    throw new Error("invalid JWK input");
  }
  return JSON.parse(bytes.toString("utf8"));
}

function readGrantPrivateJwk(
  config: PortableVaultGrantsEnabledConfig
): PortableVaultGrantPrivateJwk {
  return privateJwkSchema.parse(
    decodeBase64UrlJson(config.grantPrivateJwkB64)
  ) as PortableVaultGrantPrivateJwk;
}

function readBrokerReceiptPublicJwks(
  config: PortableVaultGrantsEnabledConfig
): PortableVaultBrokerReceiptPublicJwk[] {
  return receiptPublicJwksSchema.parse(
    decodeBase64UrlJson(config.brokerReceiptPublicJwksB64)
  ) as PortableVaultBrokerReceiptPublicJwk[];
}

function decodeCanonicalCoordinate(value: string): Buffer {
  if (!BASE64URL_32_BYTES.test(value)) {
    throw new PortableVaultGrantValidationError("Invalid ephemeral public key");
  }
  const bytes = Buffer.from(value, "base64url");
  if (bytes.byteLength !== 32 || bytes.toString("base64url") !== value) {
    throw new PortableVaultGrantValidationError("Invalid ephemeral public key");
  }
  return bytes;
}

export function validatePortableVaultGrantsConfig(
  config: { webauthn: { portableVaultGrants?: { enabled?: boolean } } }
): void {
  const broker = config.webauthn.portableVaultGrants;
  if (!broker?.enabled) return;

  const enabled = broker as unknown as PortableVaultGrantsEnabledConfig;
  const ttl = enabled.ttlSeconds ?? 60;
  const subjectBytes = Buffer.from(enabled.opaqueSubjectKey ?? "", "base64url");
  if (
    !enabled.issuer?.trim() ||
    enabled.issuer.length > 256 ||
    !URL.canParse(enabled.issuer) ||
    !enabled.appId?.trim() ||
    !/^[a-z][a-z0-9_-]{1,31}$/.test(enabled.appId) ||
    enabled.appId.length > 128 ||
    !URL.canParse(enabled.audience) ||
    !URL.canParse(enabled.brokerReceiptIssuer) ||
    !Number.isInteger(ttl) ||
    ttl < 15 ||
    ttl > 120 ||
    subjectBytes.byteLength < 32 ||
    subjectBytes.byteLength > 64 ||
    enabled.opaqueSubjectKey.length > 86 ||
    subjectBytes.toString("base64url") !== enabled.opaqueSubjectKey
  ) {
    throw new PortableVaultGrantConfigurationError(
      "Invalid webauthn.portableVaultGrants configuration"
    );
  }

  try {
    const grantPrivateJwk = readGrantPrivateJwk(enabled);
    const receiptPublicJwks = readBrokerReceiptPublicJwks(enabled);
    const brokerKeyIds = receiptPublicJwks.map((key) => key.kid);
    if (new Set(brokerKeyIds).size !== brokerKeyIds.length) {
      throw new Error("duplicate receipt key id");
    }
    const signingKey = createPrivateKey({ key: grantPrivateJwk, format: "jwk" });
    if (
      signingKey.asymmetricKeyType !== "ec" ||
      signingKey.asymmetricKeyDetails?.namedCurve !== "prime256v1"
    ) {
      throw new Error("invalid signing key");
    }
    for (const receiptKey of receiptPublicJwks) {
      const publicKey = createPublicKey({ key: receiptKey, format: "jwk" });
      if (
        publicKey.asymmetricKeyType !== "ec" ||
        publicKey.asymmetricKeyDetails?.namedCurve !== "prime256v1" ||
        "d" in receiptKey
      ) {
        throw new Error("invalid receipt key");
      }
    }
  } catch {
    throw new PortableVaultGrantConfigurationError(
      "Invalid webauthn.portableVaultGrants ES256 key configuration"
    );
  }
}

export function requirePortableVaultGrantsConfig(
  config: { webauthn: { portableVaultGrants?: { enabled?: boolean } } }
): PortableVaultGrantsEnabledConfig {
  const broker = config.webauthn.portableVaultGrants;
  if (!broker?.enabled) {
    const error = new Error("Portable vault grants are not enabled");
    error.name = "NotFoundError";
    throw error;
  }
  return broker as unknown as PortableVaultGrantsEnabledConfig;
}

export function normalizeAndThumbprintEphemeralPublicKey(
  value: PortableVaultEphemeralPublicKeyJwk
): { jwk: PortableVaultEphemeralPublicKeyJwk; thumbprint: string } {
  if (
    !value ||
    typeof value !== "object" ||
    Object.keys(value).sort().join(",") !== "crv,kty,x,y" ||
    value.kty !== "EC" ||
    value.crv !== "P-256"
  ) {
    throw new PortableVaultGrantValidationError("Invalid ephemeral public key");
  }
  decodeCanonicalCoordinate(value.x);
  decodeCanonicalCoordinate(value.y);

  try {
    createPublicKey({ key: value, format: "jwk" });
  } catch {
    throw new PortableVaultGrantValidationError("Invalid ephemeral public key");
  }

  const canonical = JSON.stringify({ crv: value.crv, kty: value.kty, x: value.x, y: value.y });
  return {
    jwk: { kty: "EC", crv: "P-256", x: value.x, y: value.y },
    thumbprint: createHash("sha256").update(canonical).digest("base64url"),
  };
}

export function hashPortableVaultOperationValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function derivePortableVaultOpaqueSubjectId(
  config: PortableVaultGrantsEnabledConfig,
  userId: string
): string {
  const key = Buffer.from(config.opaqueSubjectKey, "base64url");
  const bytes = createHmac("sha256", key)
    .update(`portable-vault-subject:v1:${config.appId}:${userId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createPortableVaultGrantJti(): string {
  return randomUUID();
}

export async function signPortableVaultGrant(
  config: PortableVaultGrantsEnabledConfig,
  claims: PortableVaultGrantClaimsV1
): Promise<string> {
  const privateJwk = readGrantPrivateJwk(config);
  const key = await importJWK(privateJwk, "ES256");
  return new CompactSign(new TextEncoder().encode(JSON.stringify(claims)))
    .setProtectedHeader({ alg: "ES256", kid: privateJwk.kid, typ: "JWT" })
    .sign(key);
}

function findReceiptKey(
  keys: PortableVaultBrokerReceiptPublicJwk[],
  kid: string | undefined
): PortableVaultBrokerReceiptPublicJwk {
  const key = kid ? keys.find((candidate) => candidate.kid === kid) : undefined;
  if (!key) throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  return key;
}

export async function verifyPortableVaultBrokerReceipt(
  config: PortableVaultGrantsEnabledConfig,
  receipt: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<PortableVaultBrokerReceiptClaimsV1> {
  let protectedHeader;
  try {
    protectedHeader = decodeProtectedHeader(receipt);
  } catch {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  if (protectedHeader.alg !== "ES256" || protectedHeader.typ !== "JWT") {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  let receiptKeys: PortableVaultBrokerReceiptPublicJwk[];
  try {
    receiptKeys = readBrokerReceiptPublicJwks(config);
  } catch {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  const keyConfig = findReceiptKey(receiptKeys, protectedHeader.kid);

  let payload: Uint8Array;
  try {
    const key = await importJWK(keyConfig, "ES256");
    ({ payload } = await compactVerify(receipt, key, { algorithms: ["ES256"] }));
  } catch {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  const result = receiptClaimsSchema.safeParse(parsed);
  if (!result.success) {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  const claims = result.data;
  if (
    claims.iss !== config.brokerReceiptIssuer ||
    claims.aud !== config.issuer ||
    claims.app_id !== config.appId ||
    claims.iat > nowSeconds + CLOCK_SKEW_SECONDS ||
    claims.exp <= nowSeconds - CLOCK_SKEW_SECONDS ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > MAX_RECEIPT_TTL_SECONDS
  ) {
    throw new PortableVaultGrantValidationError("Invalid broker completion receipt");
  }
  return claims;
}
