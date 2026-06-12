import { describe, it, expect, vi, beforeEach } from "vitest";
import { initSecureAuthRuntime } from "@/core/secure-auth-runtime";
import { registerPost as POST } from "@/test/helpers/handlers";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { hashPassword } from "@/modules/security/policies/password-hashing";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/modules/account/repositories/user-repository", () => ({
  userRepository: mocks.userRepository,
}));

vi.mock("@/modules/account/repositories/user-repository", () => ({
  userRepository: mocks.userRepository,
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

vi.mock("@/modules/account/services/account-auth-service", () => ({
  accountAuthService: {
    sendVerificationEmailForUser: vi.fn(async () => ({ alreadyVerified: false })),
  },
}));

describe("register API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initSecureAuthRuntime(buildTestSecureAuthConfig());
  });

  it("creates a new user with a bcrypt password hash", async () => {
    mocks.userRepository.findByEmail.mockResolvedValue(null);
    mocks.userRepository.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: true,
      requireEmailVerificationBeforeSignIn: false,
    });
    expect(hashPassword).toHaveBeenCalledWith("password123");
    expect(mocks.userRepository.create).toHaveBeenCalledWith({
      email: "new@example.com",
      authProvider: "credentials",
      passwordHash: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    });
  });

  it("rejects invalid input", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "short" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mocks.userRepository.findByEmail.mockResolvedValue({ id: "existing" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "exists@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(409);
  });

  it("skips verification email when disabled by account policy", async () => {
    initSecureAuthRuntime(
      buildTestSecureAuthConfig({
        accountPolicy: {
          sendVerificationOnRegister: false,
          requireEmailVerificationBeforeSignIn: false,
        },
      })
    );
    const { accountAuthService } = await import("@/modules/account/services/account-auth-service");

    mocks.userRepository.findByEmail.mockResolvedValue(null);
    mocks.userRepository.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: false,
      requireEmailVerificationBeforeSignIn: false,
    });
    expect(accountAuthService.sendVerificationEmailForUser).not.toHaveBeenCalled();
  });

  it("rejects weak passwords when policy enforcement is enabled", async () => {
    initSecureAuthRuntime(
      buildTestSecureAuthConfig({
        passwordPolicy: {
          enforcement: "enforce",
          minLength: 12,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSymbol: false,
          blockCommonPasswords: true,
          minScore: 2,
        },
      })
    );
    mocks.userRepository.findByEmail.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/common|characters|policy/i),
    });
    expect(mocks.userRepository.create).not.toHaveBeenCalled();
  });

  it("accepts strong passwords when policy enforcement is enabled", async () => {
    initSecureAuthRuntime(
      buildTestSecureAuthConfig({
        passwordPolicy: {
          enforcement: "enforce",
          minLength: 12,
          requireUppercase: false,
          requireLowercase: false,
          requireNumber: false,
          requireSymbol: false,
          blockCommonPasswords: true,
          minScore: 2,
        },
      })
    );
    mocks.userRepository.findByEmail.mockResolvedValue(null);
    mocks.userRepository.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "Riverstone-Kettle-2026!",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(mocks.userRepository.create).toHaveBeenCalled();
  });
});