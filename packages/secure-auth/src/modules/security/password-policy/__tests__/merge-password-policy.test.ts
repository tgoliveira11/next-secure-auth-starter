import { describe, it, expect } from "vitest";
import {
  DEFAULT_PASSWORD_POLICY,
  mergePasswordPolicy,
} from "@/modules/security/password-policy/index";

describe("mergePasswordPolicy", () => {
  it("merges partial overrides with package defaults", () => {
    const effective = mergePasswordPolicy({ minLength: 5 });

    expect(effective.minLength).toBe(5);
    expect(effective.enforcement).toBe(DEFAULT_PASSWORD_POLICY.enforcement);
    expect(effective.blockCommonPasswords).toBe(DEFAULT_PASSWORD_POLICY.blockCommonPasswords);
    expect(effective.minScore).toBe(DEFAULT_PASSWORD_POLICY.minScore);
  });

  it("defaults to package policy when override is omitted", () => {
    expect(mergePasswordPolicy()).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  it("defaults minLength to 12 when override is empty", () => {
    expect(mergePasswordPolicy({}).minLength).toBe(12);
  });
});
