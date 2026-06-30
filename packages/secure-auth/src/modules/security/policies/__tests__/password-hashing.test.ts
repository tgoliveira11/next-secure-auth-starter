import { describe, it, expect } from "vitest";
import { assertPasswordHashFormat, hashPassword, verifyPassword } from "../password-hashing";

describe("password hashing", () => {
  it("rejects invalid hash formats", () => {
    expect(() => assertPasswordHashFormat("not-a-bcrypt-hash")).toThrow(/bcrypt digest/);
  });

  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
