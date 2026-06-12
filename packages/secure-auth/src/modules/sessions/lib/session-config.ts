import {
  resolveSessionLastUsedUpdateIntervalMs,
  resolveSessionMaxAgeMs,
} from "@/core/config-resolvers.js";

/** Align account session expiry with NextAuth JWT session max age (seconds). */
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionMaxAgeMs(): number {
  return resolveSessionMaxAgeMs();
}

export function getSessionLastUsedUpdateIntervalMs(): number {
  return resolveSessionLastUsedUpdateIntervalMs();
}