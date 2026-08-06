import bcrypt from "bcryptjs";
import { hash as hashArgon2 } from "@node-rs/argon2";
import { describe, expect, it } from "vitest";
import {
  ARGON2ID_PARAMETERS,
  assertPasswordHashFormat,
  hashPassword,
  identifyPasswordHashAlgorithm,
  passwordHashNeedsRehash,
  verifyPassword,
} from "../password-hashing";

describe("password hashing", () => {
  it("rejects invalid hash formats", () => {
    expect(() => assertPasswordHashFormat("not-a-password-hash")).toThrow(
      /Argon2id or legacy bcrypt digest/
    );
    expect(identifyPasswordHashAlgorithm("plaintext")).toBeNull();
  });

  it("writes Argon2id v19 with explicit OWASP parameters and verifies it", async () => {
    expect(ARGON2ID_PARAMETERS.algorithm).toBe(2);
    expect(ARGON2ID_PARAMETERS.version).toBe(1);
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(identifyPasswordHashAlgorithm(hash)).toBe("argon2id");
    expect(passwordHashNeedsRehash(hash)).toBe(false);
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("verifies legacy bcrypt and marks it for transparent rehash", async () => {
    const hash = await bcrypt.hash("legacy-password", 12);
    expect(identifyPasswordHashAlgorithm(hash)).toBe("bcrypt");
    expect(passwordHashNeedsRehash(hash)).toBe(true);
    await expect(verifyPassword("legacy-password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("marks Argon2id hashes with weaker parameters for rehash", async () => {
    const weakHash = await hashArgon2("password", {
      ...ARGON2ID_PARAMETERS,
      memoryCost: 12_288,
    });
    expect(passwordHashNeedsRehash(weakHash)).toBe(true);
  });

  it("marks Argon2id hashes with a shorter output for rehash", async () => {
    const shortHash = await hashArgon2("password", {
      ...ARGON2ID_PARAMETERS,
      outputLen: 16,
    });
    expect(passwordHashNeedsRehash(shortHash)).toBe(true);
  });

  it("rejects an obsolete Argon2 version instead of passing it to the verifier", async () => {
    const currentHash = await hashPassword("password");
    const obsoleteHash = currentHash.replace("$v=19$", "$v=16$");
    expect(() => passwordHashNeedsRehash(obsoleteHash)).toThrow(/Argon2id or legacy bcrypt/);
    await expect(verifyPassword("password", obsoleteHash)).rejects.toThrow(
      /Argon2id or legacy bcrypt/
    );
  });
});
