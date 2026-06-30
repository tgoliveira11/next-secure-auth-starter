import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  TwoFactorEncryptionKeyError,
} from "../two-factor-secret-crypto";

describe("two-factor secret crypto", () => {
  const config = buildTestSecureAuthConfig();

  it("encrypts and decrypts TOTP secrets", () => {
    const encrypted = encryptTwoFactorSecret(config, "JBSWY3DPEHPK3PXP");
    expect(encrypted.version).toBe("tf-v1");
    expect(decryptTwoFactorSecret(config, encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("throws when encryption key is missing", () => {
    const missingKey = buildTestSecureAuthConfig({
      auth: {
        ...buildTestSecureAuthConfig().auth,
        twoFactorEncryptionKey: "",
      },
    });
    expect(() => encryptTwoFactorSecret(missingKey, "secret")).toThrow(TwoFactorEncryptionKeyError);
  });

  it("rejects unsupported payload versions", () => {
    const encrypted = encryptTwoFactorSecret(config, "secret");
    expect(() =>
      decryptTwoFactorSecret(config, { ...encrypted, version: "tf-v0" as typeof encrypted.version })
    ).toThrow(/Unsupported two-factor secret payload version/);
  });
});
