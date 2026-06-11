import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as statusGet } from "@/app/api/account/2fa/status/route";
import { POST as setupStartPost } from "@/app/api/account/2fa/setup/start/route";
import { POST as setupVerifyPost } from "@/app/api/account/2fa/setup/verify/route";
import { POST as disablePost } from "@/app/api/account/2fa/disable/route";
import { POST as loginStartPost } from "@/app/api/auth/login/start/route";
import { GET as challengeStatusGet } from "@/app/api/auth/login/challenge-status/route";
import { POST as verify2faPost } from "@/app/api/auth/login/verify-2fa/route";
import { USER_ID } from "@/test/helpers/fixtures";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/modules/two-factor/lib/login-challenge-cookie";

const mocks = vi.hoisted(() => ({
  requireFullyAuthenticatedUser: vi.fn(),
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

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  };
});

vi.mock("@/server/services/two-factor-service", () => ({
  twoFactorService: {
    getStatus: mocks.getStatus,
    startSetup: mocks.startSetup,
    verifySetup: mocks.verifySetup,
    disable: mocks.disable,
  },
}));

vi.mock("@/server/services/auth-login-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/auth-login-service")>();
  return {
    ...actual,
    authLoginService: {
      ...actual.authLoginService,
      startCredentialsLogin: mocks.startCredentialsLogin,
      verifyTwoFactorLogin: mocks.verifyTwoFactorLogin,
    },
  };
});

describe("two-factor API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
  });

  it("GET status returns 2FA state", async () => {
    mocks.getStatus.mockResolvedValue({ enabled: false, enabledAt: null, hasPendingSetup: false });
    const res = await statusGet();
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
    const res = await setupStartPost(new Request("http://localhost"));
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
      })
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
      })
    );
    await expect(res.json()).resolves.toEqual({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
    });
    expect(res.cookies.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value).toBe(
      "challenge-token-1234567890"
    );
  });

  it("challenge status reflects pending cookie state", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const pending = await challengeStatusGet();
    await expect(pending.json()).resolves.toEqual({ pending: true });

    mocks.cookiesGet.mockReturnValue(undefined);
    const missing = await challengeStatusGet();
    await expect(missing.json()).resolves.toEqual({ pending: false });
  });

  it("login start rejects invalid payloads and invalid credentials", async () => {
    const { InvalidCredentialsError } = await import("@/server/services/auth-login-service");
    const badPayload = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", password: "" }),
      })
    );
    expect(badPayload.status).toBe(400);

    mocks.startCredentialsLogin.mockRejectedValue(new InvalidCredentialsError());
    const invalid = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "wrongpass" }),
      })
    );
    expect(invalid.status).toBe(401);
  });

  it("login start rejects password values in the URL", async () => {
    const res = await loginStartPost(
      new Request("http://localhost/api/auth/login/start?password=secret", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("disable requires authenticated user and valid payload", async () => {
    mocks.disable.mockResolvedValue({ success: true });
    const res = await disablePost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
  });

  it("setup verify and disable reject invalid payloads", async () => {
    const badVerify = await setupVerifyPost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ code: "12" }) })
    );
    expect(badVerify.status).toBe(400);

    const badDisable = await disablePost(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({}) })
    );
    expect(badDisable.status).toBe(400);
  });

  it("setup verify maps service failures", async () => {
    mocks.verifySetup.mockRejectedValue(new Error("db down"));
    const res = await setupVerifyPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      })
    );
    expect(res.status).toBe(500);
  });

  it("verify-2fa returns login token on success", async () => {
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token" });
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ loginToken: "login-token" });
    expect(res.cookies.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value).toBe("");
  });

  it("verify-2fa rejects invalid payloads", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ challengeToken: "short", code: "12" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("verify-2fa maps challenge and code failures", async () => {
    const { InvalidTwoFactorChallengeError, InvalidTwoFactorCodeError } = await import(
      "@/server/services/auth-login-service"
    );

    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new InvalidTwoFactorChallengeError("expired"));
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const challengeFailure = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      })
    );
    expect(challengeFailure.status).toBe(401);

    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new InvalidTwoFactorCodeError("invalid code"));
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const codeFailure = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      })
    );
    expect(codeFailure.status).toBe(401);
  });

  it("verify-2fa maps unexpected service failures", async () => {
    mocks.verifyTwoFactorLogin.mockRejectedValueOnce(new Error("db down"));
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    const res = await verify2faPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          code: "123456",
        }),
      })
    );
    expect(res.status).toBe(500);
  });

  it("login start maps unexpected service failures", async () => {
    mocks.startCredentialsLogin.mockRejectedValueOnce(new Error("db down"));
    const res = await loginStartPost(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password: "password123" }),
      })
    );
    expect(res.status).toBe(500);
  });
});
