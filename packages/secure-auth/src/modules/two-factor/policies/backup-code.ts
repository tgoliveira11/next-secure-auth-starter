import { createHash, createHmac, randomBytes } from "node:crypto";
import { requireTwoFactorEncryptionKey } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { TwoFactorEncryptionKeyError } from "./two-factor-secret-crypto.js";

const BACKUP_CODE_GROUPS = 3;
const BACKUP_CODE_GROUP_LENGTH = 4;
const BACKUP_CODE_HASH_PREFIX = "hmac-sha256:v1:";
const BACKUP_CODE_HASH_DOMAIN = "@tgoliveira/secure-auth:two-factor-backup-code:v1";

export function generateBackupCodes(count: number): string[] {
  return Array.from({ length: count }, () => generateBackupCode());
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

export function hashBackupCode(config: SecureAuthConfig, code: string): string {
  const pepper = getBackupCodePepper(config);
  const normalized = normalizeBackupCode(code);
  const digest = createHmac("sha256", pepper)
    .update(BACKUP_CODE_HASH_DOMAIN)
    .update("\0")
    .update(normalized)
    .digest("hex");
  return `${BACKUP_CODE_HASH_PREFIX}${digest}`;
}

/** Supports backup codes issued before 0.13.0 until they are consumed or regenerated. */
export function getBackupCodeHashCandidates(config: SecureAuthConfig, code: string): string[] {
  return [hashBackupCode(config, code), hashLegacyBackupCode(config, code)];
}

function getBackupCodePepper(config: SecureAuthConfig): string {
  let pepper: string;
  try {
    pepper = requireTwoFactorEncryptionKey(config);
  } catch {
    throw new TwoFactorEncryptionKeyError();
  }
  return pepper;
}

function hashLegacyBackupCode(config: SecureAuthConfig, code: string): string {
  const pepper = getBackupCodePepper(config);
  const normalized = normalizeBackupCode(code);
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

function generateBackupCode(): string {
  const bytes = randomBytes(BACKUP_CODE_GROUPS * 2);
  const hex = bytes.toString("hex").toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < BACKUP_CODE_GROUPS; i++) {
    groups.push(hex.slice(i * BACKUP_CODE_GROUP_LENGTH, (i + 1) * BACKUP_CODE_GROUP_LENGTH));
  }
  return groups.join("-");
}
