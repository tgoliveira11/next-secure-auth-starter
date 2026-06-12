import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_SRC = join(process.cwd(), "../../packages/secure-auth/src");
const SAMPLE_BCRYPT_HASH =
  "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

describe("password storage security", () => {
  it("stores credentials passwords as password_hash bcrypt digests, not plaintext columns", () => {
    const schema = readFileSync(join(PACKAGE_SRC, "drizzle/schema.ts"), "utf8");
    const usersSection = schema.slice(schema.indexOf("export const users"));

    expect(usersSection).toContain('passwordHash: text("password_hash")');
    expect(usersSection).not.toMatch(/\bpassword:\s*text\(/);
    expect(usersSection).not.toContain("plaintextPassword");
  });

  it("user repository validates bcrypt digest format", () => {
    const repoSource = readFileSync(
      join(PACKAGE_SRC, "modules/account/repositories/user-repository.ts"),
      "utf8"
    );
    expect(repoSource).toContain("validateStoredPasswordHash");
    expect(repoSource).toContain("assertPasswordHashFormat");
  });

  it("register handler hashes before persistence", () => {
    const registerHandler = readFileSync(
      join(PACKAGE_SRC, "server/routes/handlers/auth/register.ts"),
      "utf8"
    );
    const registerWrapper = readFileSync(
      join(process.cwd(), "src/app/api/auth/register/route.ts"),
      "utf8"
    );
    expect(registerHandler).toContain("hashPassword");
    expect(registerHandler).not.toContain("bcrypt.hash");
    expect(registerHandler).not.toMatch(/passwordHash:\s*parsed\.data\.password/);
    expect(registerWrapper).toContain("secureAuth.routes.register.POST");
  });

  it("login and account deletion verify against bcrypt digests only", () => {
    const authLoginService = readFileSync(
      join(PACKAGE_SRC, "modules/auth/services/auth-login-service.ts"),
      "utf8"
    );
    const accountService = readFileSync(
      join(PACKAGE_SRC, "modules/account/services/account-service.ts"),
      "utf8"
    );

    expect(authLoginService).toContain("verifyPassword");
    expect(authLoginService).not.toContain("bcrypt.compare");
    expect(accountService).toContain("verifyPassword");
    expect(accountService).not.toContain("bcrypt.compare");
  });

  it("accepts bcrypt digest format", () => {
    expect(SAMPLE_BCRYPT_HASH).toMatch(/^\$2[aby]\$\d{2}\$/);
  });
});
