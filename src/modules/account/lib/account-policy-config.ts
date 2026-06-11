export type AccountPolicyConfig = {
  sendVerificationOnRegister: boolean;
  requireEmailVerificationBeforeSignIn: boolean;
};

export const DEFAULT_ACCOUNT_POLICY: AccountPolicyConfig = {
  sendVerificationOnRegister: true,
  requireEmailVerificationBeforeSignIn: false,
};

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export function getAccountPolicyConfig(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {}
): AccountPolicyConfig {
  return {
    sendVerificationOnRegister: readBoolean(
      env.EMAIL_VERIFICATION_SEND_ON_REGISTER,
      DEFAULT_ACCOUNT_POLICY.sendVerificationOnRegister
    ),
    requireEmailVerificationBeforeSignIn: readBoolean(
      env.EMAIL_VERIFICATION_REQUIRE_BEFORE_SIGN_IN,
      DEFAULT_ACCOUNT_POLICY.requireEmailVerificationBeforeSignIn
    ),
  };
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
  env?: Record<string, string | undefined>
): boolean {
  const policy = getAccountPolicyConfig(env);
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
  env?: Record<string, string | undefined>
): void {
  if (credentialsSignInRequiresEmailVerification(user, env)) {
    throw new EmailVerificationRequiredError();
  }
}

export class EmailVerificationRequiredError extends Error {
  constructor() {
    super("Verify your email before signing in.");
    this.name = "EmailVerificationRequiredError";
  }
}
