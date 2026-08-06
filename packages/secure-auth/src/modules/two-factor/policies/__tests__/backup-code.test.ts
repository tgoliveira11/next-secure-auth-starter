import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  getBackupCodeHashCandidates,
  hashBackupCode,
  normalizeBackupCode,
} from "../backup-code";

describe("backup-code hashing", () => {
  it("normalizes formatting and writes a domain-separated HMAC", () => {
    const config = buildTestSecureAuthConfig();
    const first = hashBackupCode(config, "abcd-1234-ef56");
    const second = hashBackupCode(config, " ABCD1234EF56 ");

    expect(normalizeBackupCode(" abcd-1234-ef56 ")).toBe("ABCD1234EF56");
    expect(first).toBe(second);
    expect(first).toMatch(/^hmac-sha256:v1:[a-f0-9]{64}$/);
    expect(first).not.toContain("ABCD1234EF56");
  });

  it("returns current and pre-0.13 legacy candidates", () => {
    const config = buildTestSecureAuthConfig();
    const code = "ABCD-1234-EF56";
    const candidates = getBackupCodeHashCandidates(config, code);
    const legacy = createHash("sha256")
      .update(`${config.auth.twoFactorEncryptionKey}:ABCD1234EF56`)
      .digest("hex");

    expect(candidates).toEqual([hashBackupCode(config, code), legacy]);
  });

  it("fails closed without the two-factor encryption key", () => {
    const config = buildTestSecureAuthConfig({
      auth: { twoFactorEncryptionKey: "" } as never,
    });
    expect(() => hashBackupCode(config, "ABCD-1234-EF56")).toThrow();
  });
});
