import type { PasswordPolicyConfig } from "../modules/security/password-policy/index.js";
import { DEFAULT_PASSWORD_POLICY } from "../modules/security/password-policy/index.js";
import type { AccountPolicyConfig } from "../modules/account/lib/account-policy-config.js";
import { DEFAULT_ACCOUNT_POLICY } from "../modules/account/lib/account-policy-config.js";
import { getSecureAuthConfig } from "./secure-auth-runtime.js";

export function resolvePasswordPolicyConfig(): PasswordPolicyConfig {
  return getSecureAuthConfig().passwordPolicy ?? DEFAULT_PASSWORD_POLICY;
}

export function resolveAccountPolicyConfig(): AccountPolicyConfig {
  const config = getSecureAuthConfig();
  const policy = config.accountPolicy;
  return {
    sendVerificationOnRegister:
      policy?.sendVerificationOnRegister ?? DEFAULT_ACCOUNT_POLICY.sendVerificationOnRegister,
    requireEmailVerificationBeforeSignIn:
      policy?.requireEmailVerificationBeforeSignIn ??
      config.auth.requireEmailVerificationBeforeSignIn ??
      DEFAULT_ACCOUNT_POLICY.requireEmailVerificationBeforeSignIn,
  };
}

export function resolveSessionMaxAgeMs(): number {
  const seconds =
    getSecureAuthConfig().sessions?.maxAgeSeconds ?? 30 * 24 * 60 * 60;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 30 * 24 * 60 * 60 * 1000;
  }
  return seconds * 1000;
}

export function resolveSessionLastUsedUpdateIntervalMs(): number {
  const seconds = getSecureAuthConfig().sessions?.lastUsedUpdateIntervalSeconds ?? 300;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 300_000;
  }
  return seconds * 1000;
}

export function resolveCookieSecure(): boolean {
  return getSecureAuthConfig().server?.cookieSecure ?? false;
}

export function resolveAuthTraceEnabled(): boolean {
  return getSecureAuthConfig().debug?.authTrace ?? false;
}

export function resolveRateLimitStore(): "memory" | "postgres" {
  return getSecureAuthConfig().rateLimit?.store ?? "memory";
}