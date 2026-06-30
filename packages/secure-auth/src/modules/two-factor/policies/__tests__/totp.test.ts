import { describe, it, expect, vi } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from "../totp";

vi.mock("otplib", () => ({
  generateSecret: vi.fn(() => "JBSWY3DPEHPK3PXP"),
  generateURI: vi.fn(({ issuer, label, secret }: { issuer: string; label: string; secret: string }) =>
    `otpauth://totp/${issuer}:${label}?secret=${secret}`
  ),
  verify: vi.fn(async ({ token }: { token: string }) => ({ valid: token === "123456" })),
}));

describe("totp policy helpers", () => {
  const config = buildTestSecureAuthConfig();

  it("generates secrets and otpauth URIs", () => {
    expect(generateTotpSecret()).toBe("JBSWY3DPEHPK3PXP");
    expect(buildOtpAuthUri(config, "user@example.com", "SECRET")).toContain("user@example.com");
  });

  it("validates six-digit TOTP codes", async () => {
    await expect(verifyTotpCode("SECRET", "123456")).resolves.toBe(true);
    await expect(verifyTotpCode("SECRET", "000000")).resolves.toBe(false);
    await expect(verifyTotpCode("SECRET", "abc")).resolves.toBe(false);
  });
});
