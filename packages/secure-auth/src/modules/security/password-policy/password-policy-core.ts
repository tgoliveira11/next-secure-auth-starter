export type PasswordPolicyEnforcement = "off" | "warn" | "enforce";

export type PasswordStrengthLabel =
  | "too_short"
  | "common"
  | "weak"
  | "okay"
  | "strong";

export type PasswordAssessment = {
  score: number;
  label: PasswordStrengthLabel;
  messages: string[];
  meetsPolicy: boolean;
};

export type PasswordPolicyConfig = {
  enforcement: PasswordPolicyEnforcement;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
  blockCommonPasswords: boolean;
  minScore: number;
  /** When true, reject passwords found in Have I Been Pwned. Default: true. */
  checkBreachedPasswords?: boolean;
};

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "123456",
    "12345678",
    "123456789",
    "qwerty",
    "abc123",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
    "master",
    "login",
    "princess",
    "football",
    "shadow",
    "sunshine",
    "iloveyou",
    "admin",
    "passw0rd",
  ].map((value) => value.toLowerCase())
);

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyConfig = {
  enforcement: "warn",
  minLength: 12,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSymbol: false,
  blockCommonPasswords: true,
  minScore: 2,
  checkBreachedPasswords: false,
};

/** Merges consumer overrides with package defaults — single source of truth for effective policy. */
export function mergePasswordPolicy(
  override?: Partial<PasswordPolicyConfig> | null
): PasswordPolicyConfig {
  return { ...DEFAULT_PASSWORD_POLICY, ...override };
}

import type { SecureAuthConfig } from "@/core/types.js";

export function getPasswordPolicyConfig(
  config?: SecureAuthConfig,
  override?: Partial<PasswordPolicyConfig>
): PasswordPolicyConfig {
  const base = config ? mergePasswordPolicy(config.passwordPolicy) : DEFAULT_PASSWORD_POLICY;
  if (!override) return base;
  return mergePasswordPolicy({ ...base, ...override });
}

export function assessPassword(
  password: string,
  config: PasswordPolicyConfig = getPasswordPolicyConfig()
): PasswordAssessment {
  const messages: string[] = [];
  let score = 0;

  if (password.length < config.minLength) {
    messages.push(`Use at least ${config.minLength} characters.`);
    return {
      score: 0,
      label: "too_short",
      messages,
      meetsPolicy: config.enforcement === "off",
    };
  }

  score += 1;

  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const number = /[0-9]/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);
  const variety = [lower, upper, number, symbol].filter(Boolean).length;

  if (config.blockCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    messages.push("This password is too common. Choose something more unique.");
    return { score: 0, label: "common", messages, meetsPolicy: false };
  }

  if (config.requireLowercase && !lower) messages.push("Add a lowercase letter.");
  if (config.requireUppercase && !upper) messages.push("Add an uppercase letter.");
  if (config.requireNumber && !number) messages.push("Add a number.");
  if (config.requireSymbol && !symbol) messages.push("Add a symbol.");

  if (password.length >= config.minLength + 4) score += 1;
  if (variety >= 3) score += 1;
  if (password.length >= 16 && variety >= 3) score += 1;

  const label: PasswordStrengthLabel =
    score <= 1 ? "weak" : score === 2 ? "okay" : "strong";

  if (label === "weak") messages.push("Try a longer passphrase with mixed character types.");
  if (label === "okay") messages.push("This password is okay. A longer passphrase would be stronger.");

  const meetsRequirements =
    (!config.requireLowercase || lower) &&
    (!config.requireUppercase || upper) &&
    (!config.requireNumber || number) &&
    (!config.requireSymbol || symbol);

  const meetsPolicy =
    config.enforcement === "off" ||
    (meetsRequirements && score >= config.minScore);

  return { score, label, messages, meetsPolicy };
}

export function validatePasswordForSubmission(
  password: string,
  config: PasswordPolicyConfig = getPasswordPolicyConfig()
): { valid: boolean; assessment: PasswordAssessment } {
  const assessment = assessPassword(password, config);
  if (config.enforcement !== "enforce") {
    return { valid: true, assessment };
  }
  return { valid: assessment.meetsPolicy, assessment };
}

export function getPasswordStrengthDisplay(label: PasswordStrengthLabel): string {
  switch (label) {
    case "too_short":
      return "Too short";
    case "common":
      return "Too common";
    case "weak":
      return "Weak";
    case "okay":
      return "Okay";
    case "strong":
      return "Strong";
  }
}

export function getPasswordPolicyHint(
  config: PasswordPolicyConfig = getPasswordPolicyConfig()
): string | undefined {
  if (config.enforcement === "off") {
    return undefined;
  }
  return `At least ${config.minLength} characters.`;
}

export function shouldShowPasswordStrengthUi(
  config: PasswordPolicyConfig = getPasswordPolicyConfig()
): boolean {
  return config.enforcement !== "off";
}
