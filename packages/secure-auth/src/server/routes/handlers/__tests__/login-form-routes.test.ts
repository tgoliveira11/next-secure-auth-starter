import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginStartFormPost as startFormPost,
  loginVerify2faFormPost as verify2faFormPost,
  loginCompletePost as completePost,
} from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  startCredentialsLogin: vi.fn(),
  verifyTwoFactorLogin: vi.fn(),
  cookiesGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookiesGet,
  })),
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    authLoginService: {
      ...base.authLoginService,
      startCredentialsLogin: mocks.startCredentialsLogin,
      verifyTwoFactorLogin: mocks.verifyTwoFactorLogin,
    },
  }));
}

function formRequest(url: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("credentials login form routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    services = await buildServices();
  });

  it("start-form redirects to 2FA and sets the challenge cookie", async () => {
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token-1234567890",
    });

    const request = formRequest("http://localhost:3000/api/auth/login/start-form", {
      email: "user@example.com",
      password: "password123",
    });

    const response = await startFormPost(request, services);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/2fa?mode=credentials");
    expect(response.cookies.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value).toBe(
      "challenge-token-1234567890"
    );
  });

  it("start-form redirects to complete when 2FA is disabled", async () => {
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token-1234567890",
    });

    const response = await startFormPost(
      formRequest("http://localhost:3000/api/auth/login/start-form", {
        email: "user@example.com",
        password: "password123",
      }),
      services
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/complete");
    expect(response.cookies.get(services.ctx.getLoginPendingTokenCookieName())?.value).toBe(
      "login-token-1234567890"
    );
  });

  it("start-form redirects to login on invalid credentials", async () => {
    const { InvalidCredentialsError } = await import("@/modules/auth/services/auth-login-service");
    mocks.startCredentialsLogin.mockRejectedValue(new InvalidCredentialsError());

    const response = await startFormPost(
      formRequest("http://localhost:3000/api/auth/login/start-form", {
        email: "user@example.com",
        password: "wrongpass",
      }),
      services
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=invalid_credentials"
    );
  });

  it("verify-2fa-form redirects to complete on success", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token-1234567890" });

    const response = await verify2faFormPost(
      formRequest("http://localhost:3000/api/auth/login/verify-2fa-form", {
        code: "123456",
      }),
      services
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/complete");
    expect(response.cookies.get(services.ctx.getLoginPendingTokenCookieName())?.value).toBe(
      "login-token-1234567890"
    );
    expect(response.cookies.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value).toBe("");
  });

  it("complete returns the pending login token once", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getLoginPendingTokenCookieName()
        ? { value: "login-token-1234567890" }
        : undefined
    );

    const response = await completePost(services);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ loginToken: "login-token-1234567890" });
    expect(response.cookies.get(services.ctx.getLoginPendingTokenCookieName())?.value).toBe("");
  });

  it("complete rejects missing pending login tokens", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const response = await completePost(services);
    expect(response.status).toBe(401);
  });

  it("complete rejects short pending login tokens", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === services.ctx.getLoginPendingTokenCookieName() ? { value: "short" } : undefined
    );
    const response = await completePost(services);
    expect(response.status).toBe(401);
  });
});
