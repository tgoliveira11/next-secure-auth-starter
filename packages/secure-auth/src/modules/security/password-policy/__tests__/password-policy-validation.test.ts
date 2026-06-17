import { describe, it, expect } from "vitest";
import {
  DEFAULT_PASSWORD_POLICY,
  resolvePasswordPolicy,
  validatePasswordAgainstPolicy,
  validatePasswordConfirmation,
  validatePasswordSetup,
  getPasswordPolicyRequirements,
  calculatePasswordStrength,
} from "../password-policy-validation";

describe("password policy validation helpers", () => {
  it("uses default policy when override is omitted", () => {
    expect(resolvePasswordPolicy()).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  it("merges partial policy overrides", () => {
    expect(resolvePasswordPolicy({ minLength: 16 }).minLength).toBe(16);
    expect(resolvePasswordPolicy({ minLength: 16 }).requireUppercase).toBe(false);
  });

  it("validates minLength and character rules", () => {
    const policy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: true,
      enforcement: "enforce" as const,
    };

    const weak = validatePasswordAgainstPolicy("short", policy);
    expect(weak.valid).toBe(false);
    expect(weak.failedRequirements.some((item) => item.id === "minLength")).toBe(true);

    const strong = validatePasswordAgainstPolicy("Riverstone-Kettle-2026!", policy);
    expect(strong.valid).toBe(true);
    expect(strong.passedRequirements.length).toBeGreaterThan(0);
  });

  it("validates password confirmation", () => {
    expect(validatePasswordConfirmation("abc", "abc")).toBe(true);
    expect(validatePasswordConfirmation("abc", "xyz")).toBe(false);
  });

  it("validates password setup with confirmation", () => {
    const result = validatePasswordSetup({
      password: "Riverstone-Kettle-2026!",
      confirmation: "Riverstone-Kettle-2026!",
      policy: { minLength: 12, enforcement: "enforce" },
    });

    expect(result.valid).toBe(true);
    expect(result.confirmation.matches).toBe(true);
  });

  it("detects confirmation mismatch in setup validation", () => {
    const result = validatePasswordSetup({
      password: "Riverstone-Kettle-2026!",
      confirmation: "Mismatch-2026!",
      policy: { minLength: 12, enforcement: "enforce" },
    });

    expect(result.valid).toBe(false);
    expect(result.confirmation.matches).toBe(false);
  });

  it("supports requireConfirmation=false", () => {
    const result = validatePasswordSetup({
      password: "Riverstone-Kettle-2026!",
      requireConfirmation: false,
      policy: { minLength: 12, enforcement: "enforce" },
    });

    expect(result.valid).toBe(true);
    expect(result.confirmation.valid).toBe(true);
  });

  it("lists static policy requirements", () => {
    const requirements = getPasswordPolicyRequirements({ minLength: 16, requireSymbol: true });
    expect(requirements.some((item) => item.id === "minLength" && item.label.includes("16"))).toBe(
      true
    );
    expect(requirements.some((item) => item.id === "symbol")).toBe(true);
  });

  it("calculates password strength labels", () => {
    expect(calculatePasswordStrength("")).toBe("empty");
    expect(calculatePasswordStrength("Riverstone-Kettle-2026!")).toBe("strong");
  });
});
