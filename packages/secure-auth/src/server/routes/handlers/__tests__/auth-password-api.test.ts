import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readModuleSource } from "@/test/helpers/module-source";
import { registerPost, accountGet } from "@/test/helpers/handlers";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
  getDeletionRequirements: vi.fn(),
}));

vi.mock("@/server/repositories/user-repository", () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    create: mocks.create,
  },
}));

vi.mock("@/server/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

vi.mock("@/server/services/account-auth-service", () => ({
  accountAuthService: {
    sendVerificationEmailForUser: vi.fn(async () => ({ alreadyVerified: false })),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
}));

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: mocks.getDeletionRequirements,
  },
}));

describe("auth password API boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects registration when password is sent in the query string", async () => {
    const res = await registerPost(
      new Request("http://localhost/api/auth/register?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not echo password or password_hash in registration responses", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    });

    const res = await registerPost(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body).toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: true,
      requireEmailVerificationBeforeSignIn: false,
    });
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("does not expose password_hash from account deletion requirements", async () => {
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      accountSessionId: "sess-1",
    });
    mocks.getDeletionRequirements.mockResolvedValue({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: "DELETE MY ACCOUNT",
    });

    const res = await accountGet();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  });

  it("verifies credentials only on the server with bcrypt helpers", () => {
    const authLoginService = readModuleSource("server/services/auth-login-service.ts");
    expect(authLoginService).toContain("verifyPassword");
    expect(authLoginService).not.toMatch(/passwordHash\s*===/);
    expect(authLoginService).not.toContain("bcrypt.compare");
  });

  it("guards package handlers against URL password transport", () => {
    const registerHandler = readFileSync(
      join(process.cwd(), "src/server/routes/handlers/auth/register.ts"),
      "utf8"
    );
    const accountHandler = readFileSync(
      join(process.cwd(), "src/server/routes/handlers/account/account.ts"),
      "utf8"
    );

    expect(registerHandler).toContain("assertPasswordNotInUrl");
    expect(accountHandler).toContain("assertPasswordNotInUrl");
  });
});
