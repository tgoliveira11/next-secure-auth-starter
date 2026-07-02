import { describe, it, expect, vi, beforeEach } from "vitest";
import { twoFactorStatusGet as statusGet } from "@/test/helpers/handlers";
import { twoFactorSetupStartPost as setupStartPost } from "@/test/helpers/handlers";
import { twoFactorSetupVerifyPost as setupVerifyPost } from "@/test/helpers/handlers";
import { twoFactorDisablePost as disablePost } from "@/test/helpers/handlers";
import { loginStartPost } from "@/test/helpers/handlers";
import { loginChallengeStatusGet as challengeStatusGet } from "@/test/helpers/handlers";
import { loginVerify2faPost as verify2faPost } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
    requireVerifiedFullyAuthenticatedUser: vi.fn(),
    requireVerifiedMutatingAccountUser: vi.fn(),
  getStatus: vi.fn(),
  startSetup: vi.fn(),
  verifySetup: vi.fn(),
  disable: vi.fn(),
  startCredentialsLogin: vi.fn(),
  verifyTwoFactorLogin: vi.fn(),
  cookiesGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookiesGet,
  })),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    requireVerifiedFullyAuthenticatedUser: mocks.requireVerifiedFullyAuthenticatedUser,
  };
});

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    authLoginService: {
      ...base.authLoginService,
      startCredentialsLogin: mocks.startCredentialsLogin,
      verifyTwoFactorLogin: mocks.verifyTwoFactorLogin,
    },
    twoFactorService: {
      ...base.twoFactorService,
      getStatus: mocks.getStatus,
      startSetup: mocks.startSetup,
      verifySetup: mocks.verifySetup,
      disable: mocks.disable,
    },
  }));
}

describe("two-factor API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    services = await buildServices();
  });

  it("GET status returns 2FA state", async () => {
    mocks.getStatus.mockResolvedValue({ enabled: false, enabledAt: null, hasPendingSetup: false });
    const res = await statusGet(services);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enabled: false,
      enabledAt: null,
      hasPendingSetup: false,
    });
  });

  it("setup start does not return otpauth URL with secret after start", async () => {
    mocks.startSetup.mockResolvedValue({
      qrCodeDataUrl: "data:image/png;base64,abc",
      manualSetupKey: "SECRETKEY",
      otpauthUrl: "otpauth://totp/secret",
      issuer: "Next Secure Auth Starter",
      accountLabel: "user@example.com",
    });
    const res = await setupStartPost(new Request("http://localhost"), services);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("otpauthUrl");
    expect(body.manualSetupKey).toBe("SECRETKEY");
  });

  it("setup verify returns backup codes once", async () => {
    mocks.verifySetup.mockResolvedValue({ success: true, backupCodes: ["AAAA-BBBB-CCCC"] });
    const res = await setupVerifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    await expect(res.json()).resolves.toEqual({
      success: true,
      backupCodes: ["AAAA-BBBB-CCCC"],
    });
  });

  it("login start returns challenge when 2FA is enabled", async () => {
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
    });
    const res = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    await expect(res.json()).resolves.toEqual({
      requiresTwoFactor: true,
    });
    expect(res.cookies.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value).toBe(
      "challenge-token-1234567890"
    );
  });

  it("challenge status reflects pending cookie state", async () => {
    const peekLoginChallenge = vi.fn().mockResolvedValue({ userId: USER_ID });
    const findById = vi.fn().mockResolvedValue({ email: "user@example.com" });
    services = await getTestServices({}, (base) => ({
      authLoginService: {
        ...base.authLoginService,
        startCredentialsLogin: mocks.startCredentialsLogin,
        verifyTwoFactorLogin: mocks.verifyTwoFactorLogin,
      },
      twoFactorService: {
        ...base.twoFactorService,
        getStatus: mocks.getStatus,
        startSetup: mocks.startSetup,
        verifySetup: mocks.verifySetup,
        disable: mocks.disable,
      },
      repos: {
        ...base.repos,
        twoFactorRepository: {
          ...base.repos.twoFactorRepository,
          peekLoginChallenge,
        },
        userRepository: {
          ...base.repos.userRepository,
          findById,
        },
      },
    }));

    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const pending = await challengeStatusGet(services);
    await expect(pending.json()).resolves.toEqual({
      pending: true,
      email: "user@example.com",
    });

    mocks.cookiesGet.mockReturnValue(undefined);
    const missing = await challengeStatusGet(services);
    await expect(missing.json()).resolves.toEqual({ pending: false });

    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    peekLoginChallenge.mockResolvedValueOnce(null);
    const expired = await challengeStatusGet(services);
    await expect(expired.json()).resolves.toEqual({ pending: false });

    peekLoginChallenge.mockResolvedValueOnce({ userId: USER_ID });
    findById.mockResolvedValueOnce(null);
    const pendingWithoutEmail = await challengeStatusGet(services);
    await expect(pendingWithoutEmail.json()).resolves.toEqual({ pending: true });
  });

  it("login start rejects invalid payloads and invalid credentials", async () => {
    const { InvalidCredentialsError } = await import("@/modules/auth/services/auth-login-service");
    const badPayload = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", password: "" }),
      }),
      services
    );
    expect(badPayload.status).toBe(400);

    mocks.startCredentialsLogin.mockRejectedValue(new InvalidCredentialsError());
    const invalid = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "wrongpass" }),
      }),
      services
    );
    expect(invalid.status).toBe(401);
  });

  it("login start rejects password values in the URL", async () => {
    const res = await loginStartPost(
      new Request("http://localhost/api/auth/login/start?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("disable requires authenticated user and valid payload", async () => {
    mocks.disable.mockResolvedValue({ success: true });
    const res = await disablePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("setup verify and disable reject invalid payloads", async () => {
    const badVerify = await setupVerifyPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "12" }) }),
      services
    );
    expect(badVerify.status).toBe(400);

    const badDisable = await disablePost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }),
      services
    );
    expect(badDisable.status).toBe(400);
  });

  it("setup verify maps service failures", async () => {
    mocks.verifySetup.mockRejectedValue(new Error("db down"));
    const res = await setupVerifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
      services
    );
    expect(res.status).toBe(500);
  });

  it("verify-2fa rejects body-only challenge token without cookie", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "challenge-token-1234567890",
          code: "123456",
        }),
      }),
      services
    );
    expect(res.status).toBe(400);
    expect(mocks.verifyTwoFactorLogin).not.toHaveBeenCalled();
  });

  it("verify-2fa uses challenge token from cookie only", async () => {
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token" });
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "cookie-challenge-token123" }
        : undefined
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: "different-body-token123",
          code: "123456",
        }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.verifyTwoFactorLogin).toHaveBeenCalledWith(
      "cookie-challenge-token123",
      { code: "123456", backupCode: undefined },
      expect.any(String)
    );
  });

  it("verify-2fa returns login token on success", async () => {
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token" });
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      }),
      services
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ loginToken: "login-token" });
    expect(res.cookies.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value).toBe("");
  });

  it("verify-2fa rejects invalid payloads", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "12" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("verify-2fa maps challenge and code failures", async () => {
    const { InvalidTwoFactorChallengeError, InvalidTwoFactorCodeError } = await import(
      "@/modules/auth/services/auth-login-service"
    );

    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new InvalidTwoFactorChallengeError());
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const challengeFailure = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      }),
      services
    );
    expect(challengeFailure.status).toBe(401);

    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new InvalidTwoFactorCodeError());
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const codeFailure = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      }),
      services
    );
    expect(codeFailure.status).toBe(401);
  });

  it("verify-2fa maps unexpected service failures", async () => {
    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new Error("db down"));
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      }),
      services
    );
    expect(res.status).toBe(500);
  });

  it("login start maps unexpected service failures", async () => {
    mocks.startCredentialsLogin.mockRejectedValueOnce(new Error("db down"));
    const res = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      }),
      services
    );
    expect(res.status).toBe(500);
  });
});
