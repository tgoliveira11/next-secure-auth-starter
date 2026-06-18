import { resolveAccountPolicyConfig } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";

export type AccountPolicyConfig = {
  sendVerificationOnRegister: boolean;
  requireEmailVerificationBeforeSignIn: boolean;
  /** When true, sensitive account/security/session APIs reject unverified sessions. Default: true. */
  requireEmailVerificationForAccountApis: boolean;
};

export const DEFAULT_ACCOUNT_POLICY: AccountPolicyConfig = {
  sendVerificationOnRegister: true,
  requireEmailVerificationBeforeSignIn: false,
  requireEmailVerificationForAccountApis: true,
};

export function accountApisRequireEmailVerification(config: SecureAuthConfig): boolean {
  const policy = getAccountPolicyConfig(config);
  return policy.requireEmailVerificationForAccountApis;
}

export function getAccountPolicyConfig(config: SecureAuthConfig): AccountPolicyConfig {
  return resolveAccountPolicyConfig(config);
}

export function isCredentialsAccount(user: {
  authProvider: string;
  passwordHash: string | null;
}): boolean {
  return user.authProvider === "credentials" && Boolean(user.passwordHash);
}

export function credentialsSignInRequiresEmailVerification(
  user: {
    authProvider: string;
    passwordHash: string | null;
    emailVerifiedAt: Date | null;
  },
  config: SecureAuthConfig
): boolean {
  const policy = getAccountPolicyConfig(config);
  if (!policy.requireEmailVerificationBeforeSignIn) return false;
  if (!isCredentialsAccount(user)) return false;
  return !user.emailVerifiedAt;
}

export function assertCredentialsEmailVerifiedForSignIn(
  user: {
    authProvider: string;
    passwordHash: string | null;
    emailVerifiedAt: Date | null;
  },
  config: SecureAuthConfig
): void {
  if (credentialsSignInRequiresEmailVerification(user, config)) {
    throw new EmailVerificationRequiredError();
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Verify your email before signing in.");
    this.name = "EmailVerificationRequiredError";
  }
}
