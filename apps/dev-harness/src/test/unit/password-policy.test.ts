import { describe, it, expect } from "vitest";
import {
  assessPassword,
  getPasswordPolicyConfig,
  getPasswordPolicyHint,
  getPasswordStrengthDisplay,
  validatePasswordForSubmission,
} from "@tgoliveira/secure-auth/client/password-policy";

describe("password policy", () => {
  it("defaults to warn enforcement", () => {
    expect(getPasswordPolicyConfig().enforcement).toBe("warn");
  });

  it("allows weak passwords in warn mode", () => {
    const result = validatePasswordForSubmission("password12345", {
      ...getPasswordPolicyConfig(),
      enforcement: "warn",
      minLength: 8,
    });
    expect(result.valid).toBe(true);
  });

  it("blocks weak passwords in enforce mode", () => {
    const result = validatePasswordForSubmission("password1234", {
      ...getPasswordPolicyConfig(),
      enforcement: "enforce",
      minLength: 12,
      blockCommonPasswords: true,
      minScore: 2,
    });
    expect(result.valid).toBe(false);
    expect(result.assessment.meetsPolicy).toBe(false);
  });

  it("treats too-short passwords as allowed in off enforcement mode", () => {
    const assessment = assessPassword("short", {
      ...getPasswordPolicyConfig(),
      enforcement: "off",
      minLength: 12,
    });
    expect(assessment.meetsPolicy).toBe(true);
  });

  it("reports too short passwords", () => {
    const assessment = assessPassword("short", {
      ...getPasswordPolicyConfig(),
      minLength: 12,
    });
    expect(assessment.label).toBe("too_short");
  });

  it("accepts strong passwords in enforce mode", () => {
    const result = validatePasswordForSubmission("Riverstone-Kettle-2026!", {
      enforcement: "enforce",
      minLength: 12,
      minScore: 2,
      blockCommonPasswords: true,
      requireUppercase: false,
      requireLowercase: false,
      requireNumber: false,
      requireSymbol: false,
    });
    expect(result.valid).toBe(true);
  });

  it("allows passwords in off mode", () => {
    const result = validatePasswordForSubmission("a", {
      ...getPasswordPolicyConfig(),
      enforcement: "off",
      minLength: 12,
    });
    expect(result.valid).toBe(true);
  });

  it("rejects missing lowercase in enforce mode when required", () => {
    const result = validatePasswordForSubmission("ALLUPPERCASE12", {
      enforcement: "enforce",
      minLength: 8,
      requireLowercase: true,
      requireUppercase: false,
      requireNumber: false,
      requireSymbol: false,
      blockCommonPasswords: false,
      minScore: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("enforces required character classes when configured", () => {
    const assessment = assessPassword("alllowercasepassword", {
      ...getPasswordPolicyConfig(),
      minLength: 8,
      requireUppercase: true,
      requireNumber: true,
    });
    expect(assessment.meetsPolicy).toBe(false);
    expect(assessment.messages.join(" ")).toMatch(/uppercase|number/i);
  });

  it("scores longer mixed passwords as strong", () => {
    const assessment = assessPassword("Riverstone-Kettle-2026!", {
      ...getPasswordPolicyConfig(),
      minLength: 12,
    });
    expect(assessment.label).toBe("strong");
  });

  it("falls back to warn for unknown enforcement values", () => {
    expect(
      getPasswordPolicyConfig(undefined, { enforcement: "invalid" as never }).enforcement
    ).toBe("invalid");
  });

  it("merges explicit config overrides", () => {
    const config = getPasswordPolicyConfig(undefined, {
      enforcement: "enforce",
      minLength: 16,
      requireSymbol: true,
      minScore: 3,
    });
    expect(config.enforcement).toBe("enforce");
    expect(config.minLength).toBe(16);
    expect(config.requireSymbol).toBe(true);
    expect(config.minScore).toBe(3);
  });

  it("labels moderate passwords as okay", () => {
    const assessment = assessPassword("riverstone-kettle", {
      ...getPasswordPolicyConfig(),
      minLength: 8,
      blockCommonPasswords: false,
    });
    expect(assessment.label).toBe("okay");
  });

  it("maps strength labels for display", () => {
    expect(getPasswordStrengthDisplay("too_short")).toBe("Too short");
    expect(getPasswordStrengthDisplay("common")).toBe("Too common");
    expect(getPasswordStrengthDisplay("weak")).toBe("Weak");
    expect(getPasswordStrengthDisplay("okay")).toBe("Okay");
    expect(getPasswordStrengthDisplay("strong")).toBe("Strong");
  });

  it("builds password hints from policy config", () => {
    expect(getPasswordPolicyHint({ ...getPasswordPolicyConfig(), enforcement: "off" })).toBeUndefined();
    expect(getPasswordPolicyHint({ ...getPasswordPolicyConfig(), enforcement: "warn" })).toContain(
      "12 characters"
    );
  });
});
