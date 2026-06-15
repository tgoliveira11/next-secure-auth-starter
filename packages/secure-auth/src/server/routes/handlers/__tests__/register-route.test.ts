import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPost as POST } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { hashPassword } from "@/modules/security/policies/password-hashing";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  sendVerificationEmailForUser: vi.fn(),
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

let services: SecureAuthServices;

async function buildServices(configOverrides: Parameters<typeof getTestServices>[0] = {}) {
  return getTestServices(configOverrides, (base) => ({
    repos: {
      ...base.repos,
      userRepository: {
        ...base.repos.userRepository,
        findByEmail: mocks.findByEmail,
        create: mocks.create,
      },
    },
    accountAuthService: {
      ...base.accountAuthService,
      sendVerificationEmailForUser: mocks.sendVerificationEmailForUser,
    },
  }));
}

describe("register API route", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: false });
    services = await buildServices();
  });

  it("creates a new user with a bcrypt password hash", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: true,
      requireEmailVerificationBeforeSignIn: false,
    });
    expect(hashPassword).toHaveBeenCalledWith("password123");
    expect(mocks.create).toHaveBeenCalledWith({
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
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email", async () => {
    mocks.findByEmail.mockResolvedValue({ id: "existing" });
    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "exists@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(409);
  });

  it("skips verification email when disabled by account policy", async () => {
    services = await buildServices({
      accountPolicy: {
        sendVerificationOnRegister: false,
        requireEmailVerificationBeforeSignIn: false,
      },
    });

    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      }),
      services
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      id: "user-1",
      email: "new@example.com",
      requiresEmailVerification: false,
      requireEmailVerificationBeforeSignIn: false,
    });
    expect(mocks.sendVerificationEmailForUser).not.toHaveBeenCalled();
  });

  it("rejects weak passwords when policy enforcement is enabled", async () => {
    services = await buildServices({
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
    });
    mocks.findByEmail.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      }),
      services
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/common|characters|policy/i),
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts strong passwords when policy enforcement is enabled", async () => {
    services = await buildServices({
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
    });
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "Riverstone-Kettle-2026!",
        }),
      }),
      services
    );

    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("accepts a 5-character password when minLength is 5", async () => {
    services = await buildServices({
      passwordPolicy: {
        enforcement: "enforce",
        minLength: 5,
        requireUppercase: false,
        requireLowercase: false,
        requireNumber: false,
        requireSymbol: false,
        blockCommonPasswords: false,
        minScore: 0,
      },
    });
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "abcde" }),
      }),
      services
    );

    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("rejects a 4-character password when minLength is 5", async () => {
    services = await buildServices({
      passwordPolicy: {
        enforcement: "enforce",
        minLength: 5,
        requireUppercase: false,
        requireLowercase: false,
        requireNumber: false,
        requireSymbol: false,
        blockCommonPasswords: false,
        minScore: 0,
      },
    });
    mocks.findByEmail.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "abcd" }),
      }),
      services
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringMatching(/5 characters/i),
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
