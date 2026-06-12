import { getAppName } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

export function getTwoFactorIssuer(config: SecureAuthConfig): string {
  return getAppName(config);
}

export const TWO_FACTOR_BACKUP_CODE_COUNT = 10;
export const TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const TWO_FACTOR_LOGIN_TOKEN_TTL_MS = 60 * 1000;
export const TWO_FACTOR_SESSION_UPGRADE_TTL_MS = 60 * 1000;
