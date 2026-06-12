import { describe, it, expect } from "vitest";
import {
  credentialsLoginStartSchema,
  twoFactorLoginVerifySchema,
  twoFactorVerifySchema,
} from "@/lib/validation/two-factor";

describe("two-factor validation schemas", () => {
  it("accepts backup codes when TOTP code is omitted", () => {
    expect(twoFactorVerifySchema.safeParse({ backupCode: "AAAA-BBBB-CCCC" }).success).toBe(true);
    expect(
      twoFactorLoginVerifySchema.safeParse({
        challengeToken: "challenge-token-1234567890",
        backupCode: "AAAA-BBBB-CCCC",
      }).success
    ).toBe(true);
  });

  it("rejects login payloads missing both code and backup code", () => {
    expect(
      twoFactorLoginVerifySchema.safeParse({
        challengeToken: "challenge-token-1234567890",
      }).success
    ).toBe(false);
  });

  it("validates credential login start payloads", () => {
    expect(
      credentialsLoginStartSchema.safeParse({
        email: "user@example.com",
        password: "password123",
      }).success
    ).toBe(true);
    expect(
      credentialsLoginStartSchema.safeParse({
        email: "user@example.com",
        password: "short",
      }).success
    ).toBe(false);
  });
});
