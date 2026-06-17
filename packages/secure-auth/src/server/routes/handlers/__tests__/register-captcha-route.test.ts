import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPost as POST } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { hashPassword } from "@/modules/security/policies/password-hashing";
import { CaptchaVerificationError } from "@/modules/captcha/errors";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  create: vi.fn(),
  sendVerificationEmailForUser: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/modules/security/policies/password-hashing", () => ({
  hashPassword: vi.fn(
    async () => "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
  ),
}));

vi.mock("@/modules/captcha/services/turnstile-verifier", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/captcha/services/turnstile-verifier")>();
  return {
    ...actual,
    verifyCaptcha: mocks.verifyTurnstile,
  };
});

let services: SecureAuthServices;

const captchaOverrides = {
  captcha: {
    enabled: true,
    provider: "turnstile" as const,
    siteKey: "site-key",
    secretKey: "secret-key",
    pages: { register: true, login: false },
  },
};

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

describe("register API route captcha", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.sendVerificationEmailForUser.mockResolvedValue({ alreadyVerified: false });
    mocks.verifyTurnstile.mockResolvedValue(undefined);
    services = await buildServices(captchaOverrides);
  });

  it("requires captcha token when register captcha is enabled", async () => {
    mocks.verifyTurnstile.mockRejectedValueOnce(new CaptchaVerificationError());

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", password: "password123" }),
      }),
      services
    );

    expect(res.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates user when captcha verification passes", async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          password: "password123",
          captchaToken: "valid-token",
        }),
      }),
      services
    );

    expect(res.status).toBe(201);
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      expect.objectContaining({ action: "register", token: "valid-token" })
    );
    expect(hashPassword).toHaveBeenCalled();
  });
});
