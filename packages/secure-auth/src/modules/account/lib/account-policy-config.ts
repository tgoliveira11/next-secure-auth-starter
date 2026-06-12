import { resolveAccountPolicyConfig } from "@/core/config-resolvers.js";

export type AccountPolicyConfig = {
  sendVerificationOnRegister: boolean;
  requireEmailVerificationBeforeSignIn: boolean;
};

export const DEFAULT_ACCOUNT_POLICY: AccountPolicyConfig = {
  sendVerificationOnRegister: true,
  requireEmailVerificationBeforeSignIn: false,
};

export function getAccountPolicyConfig(
  override?: AccountPolicyConfig
): AccountPolicyConfig {
  if (override) return override;
  try {
    return resolveAccountPolicyConfig();
  } catch {
    return DEFAULT_ACCOUNT_POLICY;
  }
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
  policyOverride?: AccountPolicyConfig
): boolean {
  const policy = getAccountPolicyConfig(policyOverride);
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
  policyOverride?: AccountPolicyConfig
): void {
  if (credentialsSignInRequiresEmailVerification(user, policyOverride)) {
    throw new EmailVerificationRequiredError();
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Verify your email before signing in.");
    this.name = "EmailVerificationRequiredError";
  }
}