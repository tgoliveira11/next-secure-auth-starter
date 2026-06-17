import {
  assessPassword,
  DEFAULT_PASSWORD_POLICY,
  mergePasswordPolicy,
  type PasswordAssessment,
  type PasswordPolicyConfig,
  type PasswordStrengthLabel,
} from "./password-policy-core.js";

export type PasswordStrengthPosition = "above" | "below";

export type PasswordStrength = "empty" | "weak" | "fair" | "good" | "strong";

export type PasswordRequirementId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "symbol"
  | "common"
  | "minScore";

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

export type PasswordValidationResult = {
  valid: boolean;
  strength: PasswordStrength;
  failedRequirements: PasswordRequirement[];
  passedRequirements: PasswordRequirement[];
  messages: string[];
};

export type PasswordSetupValidationResult = {
  valid: boolean;
  password: PasswordValidationResult;
  confirmation: {
    valid: boolean;
    matches: boolean;
    message?: string;
  };
};

/** Alias for `mergePasswordPolicy` — resolves partial overrides with package defaults. */
export const resolvePasswordPolicy = mergePasswordPolicy;

function mapStrengthLabel(password: string, label: PasswordStrengthLabel, score: number): PasswordStrength {
  if (!password) return "empty";
  if (label === "too_short" || label === "common" || label === "weak") return "weak";
  if (label === "okay") return score >= 3 ? "good" : "fair";
  return "strong";
}

function buildRequirementList(
  password: string,
  config: PasswordPolicyConfig,
  assessment: PasswordAssessment
): { passed: PasswordRequirement[]; failed: PasswordRequirement[] } {
  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const number = /[0-9]/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);

  const candidates: PasswordRequirement[] = [
    {
      id: "minLength",
      label: `At least ${config.minLength} characters`,
      met: password.length >= config.minLength,
    },
  ];

  if (config.requireUppercase) {
    candidates.push({ id: "uppercase", label: "Uppercase letter", met: upper });
  }
  if (config.requireLowercase) {
    candidates.push({ id: "lowercase", label: "Lowercase letter", met: lower });
  }
  if (config.requireNumber) {
    candidates.push({ id: "number", label: "Number", met: number });
  }
  if (config.requireSymbol) {
    candidates.push({ id: "symbol", label: "Symbol", met: symbol });
  }
  if (config.blockCommonPasswords && password.length > 0) {
    candidates.push({
      id: "common",
      label: "Not a common password",
      met: assessment.label !== "common",
    });
  }
  if (config.minScore > 0 && password.length >= config.minLength) {
    candidates.push({
      id: "minScore",
      label: `Strength score at least ${config.minScore}`,
      met: assessment.score >= config.minScore,
    });
  }

  return {
    passed: candidates.filter((item) => item.met),
    failed: candidates.filter((item) => !item.met),
  };
}

export function getPasswordPolicyRequirements(
  policy?: Partial<PasswordPolicyConfig>
): PasswordRequirement[] {
  const config = resolvePasswordPolicy(policy);
  const requirements: PasswordRequirement[] = [
    { id: "minLength", label: `At least ${config.minLength} characters`, met: false },
  ];
  if (config.requireUppercase) {
    requirements.push({ id: "uppercase", label: "Uppercase letter", met: false });
  }
  if (config.requireLowercase) {
    requirements.push({ id: "lowercase", label: "Lowercase letter", met: false });
  }
  if (config.requireNumber) {
    requirements.push({ id: "number", label: "Number", met: false });
  }
  if (config.requireSymbol) {
    requirements.push({ id: "symbol", label: "Symbol", met: false });
  }
  if (config.blockCommonPasswords) {
    requirements.push({ id: "common", label: "Not a common password", met: false });
  }
  if (config.minScore > 0) {
    requirements.push({
      id: "minScore",
      label: `Strength score at least ${config.minScore}`,
      met: false,
    });
  }
  return requirements;
}

export function calculatePasswordStrength(
  password: string,
  policy?: Partial<PasswordPolicyConfig>
): PasswordStrength {
  if (!password) return "empty";
  const config = resolvePasswordPolicy(policy);
  const assessment = assessPassword(password, config);
  return mapStrengthLabel(password, assessment.label, assessment.score);
}

export function validatePasswordAgainstPolicy(
  password: string,
  policy?: Partial<PasswordPolicyConfig>
): PasswordValidationResult {
  const config = resolvePasswordPolicy(policy);
  const assessment = assessPassword(password, config);
  const { passed, failed } = buildRequirementList(password, config, assessment);
  const strength = mapStrengthLabel(password, assessment.label, assessment.score);

  const valid =
    password.length > 0 &&
    failed.length === 0 &&
    (config.enforcement === "off" || assessment.meetsPolicy);

  return {
    valid,
    strength,
    passedRequirements: passed,
    failedRequirements: failed,
    messages: assessment.messages,
  };
}

export function validatePasswordConfirmation(password: string, confirmation: string): boolean {
  return password.length > 0 && confirmation.length > 0 && password === confirmation;
}

export function validatePasswordSetup(input: {
  password: string;
  confirmation?: string;
  policy?: Partial<PasswordPolicyConfig>;
  requireConfirmation?: boolean;
  confirmationMismatchMessage?: string;
}): PasswordSetupValidationResult {
  const requireConfirmation = input.requireConfirmation !== false;
  const passwordResult = validatePasswordAgainstPolicy(input.password, input.policy);
  const mismatchMessage =
    input.confirmationMismatchMessage ?? "Passwords do not match.";

  if (!requireConfirmation) {
    return {
      valid: passwordResult.valid,
      password: passwordResult,
      confirmation: { valid: true, matches: true },
    };
  }

  const confirmationValue = input.confirmation ?? "";
  const matches = validatePasswordConfirmation(input.password, confirmationValue);
  const confirmation = {
    valid: matches,
    matches,
    message: matches ? undefined : mismatchMessage,
  };

  return {
    valid: passwordResult.valid && confirmation.valid,
    password: passwordResult,
    confirmation,
  };
}

export { DEFAULT_PASSWORD_POLICY };
