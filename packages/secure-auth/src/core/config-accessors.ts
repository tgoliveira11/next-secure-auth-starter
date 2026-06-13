import type { PasswordPolicyConfig } from "../modules/security/password-policy/index.js";
import { DEFAULT_PASSWORD_POLICY } from "../modules/security/password-policy/index.js";
import type { AccountPolicyConfig } from "../modules/account/lib/account-policy-config.js";
import { DEFAULT_ACCOUNT_POLICY } from "../modules/account/lib/account-policy-config.js";
import type { SecureAuthConfig } from "./types.js";

export function getAppSlug(config: SecureAuthConfig): string {
  return config.app.slug;
}

export function getAppName(config: SecureAuthConfig): string {
  return config.app.name;
}

export function requireNextAuthSecret(config: SecureAuthConfig): string {
  const secret = config.auth.nextAuthSecret;
  if (!secret) {
    throw new Error(
      "@tgoliveira/secure-auth: auth.nextAuthSecret is required in createSecureAuth(config)."
    );
  }
  return secret;
}

export function requireTwoFactorEncryptionKey(config: SecureAuthConfig): string {
  const key = config.auth.twoFactorEncryptionKey;
  if (!key) {
    throw new Error(
      "@tgoliveira/secure-auth: auth.twoFactorEncryptionKey is required in createSecureAuth(config)."
    );
  }
  return key;
}

export function resolvePasswordPolicyConfig(config: SecureAuthConfig): PasswordPolicyConfig {
  return config.passwordPolicy ?? DEFAULT_PASSWORD_POLICY;
}

export function resolveAccountPolicyConfig(config: SecureAuthConfig): AccountPolicyConfig {
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

export function resolveSessionMaxAgeMs(config: SecureAuthConfig): number {
  const seconds = config.sessions?.maxAgeSeconds ?? 30 * 24 * 60 * 60;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 30 * 24 * 60 * 60 * 1000;
  }
  return seconds * 1000;
}

export function resolveSessionLastUsedUpdateIntervalMs(config: SecureAuthConfig): number {
  const seconds = config.sessions?.lastUsedUpdateIntervalSeconds ?? 300;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 300_000;
  }
  return seconds * 1000;
}

export function resolveSingleActiveSessionEnabled(config: SecureAuthConfig): boolean {
  return config.sessions?.singleActiveSession === true;
}

export function resolveRevocationPollIntervalSeconds(config: SecureAuthConfig): number {
  if (config.sessions?.singleActiveSession !== true) {
    return 0;
  }
  const seconds = config.sessions?.revocationPollIntervalSeconds;
  if (seconds === undefined) {
    return 10;
  }
  if (!Number.isFinite(seconds) || seconds < 5) {
    return 10;
  }
  return Math.min(seconds, 300);
}

export function resolveCookieSecure(config: SecureAuthConfig): boolean {
  return config.server?.cookieSecure ?? false;
}

export function resolveAuthTraceEnabled(config: SecureAuthConfig): boolean {
  return config.debug?.authTrace ?? false;
}

export function resolveRateLimitStore(config: SecureAuthConfig): "memory" | "postgres" {
  return config.rateLimit?.store ?? "memory";
}
