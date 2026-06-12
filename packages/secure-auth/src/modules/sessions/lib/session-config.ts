import {
  resolveSessionLastUsedUpdateIntervalMs,
  resolveSessionMaxAgeMs,
} from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

/** Align account session expiry with NextAuth JWT session max age (seconds). */
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionMaxAgeMs(config: SecureAuthConfig): number {
  return resolveSessionMaxAgeMs(config);
}

export function getSessionLastUsedUpdateIntervalMs(config: SecureAuthConfig): number {
  return resolveSessionLastUsedUpdateIntervalMs(config);
}
