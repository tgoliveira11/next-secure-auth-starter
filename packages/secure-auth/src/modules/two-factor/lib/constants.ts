import { APP_NAME } from "@/lib/brand";

export const TWO_FACTOR_ISSUER = APP_NAME;
export const TWO_FACTOR_BACKUP_CODE_COUNT = 10;
export const TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const TWO_FACTOR_LOGIN_TOKEN_TTL_MS = 60 * 1000;
export const TWO_FACTOR_SESSION_UPGRADE_TTL_MS = 60 * 1000;
