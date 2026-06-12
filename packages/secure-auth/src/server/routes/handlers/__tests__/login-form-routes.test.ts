import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginStartFormPost as startFormPost,
  loginVerify2faFormPost as verify2faFormPost,
  loginCompletePost as completePost,
} from "@/test/helpers/handlers";
import {
  LOGIN_PENDING_TOKEN_COOKIE,
} from "@/modules/auth/lib/login-pending-cookie";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/modules/two-factor/lib/login-challenge-cookie";

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

function formRequest(url: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("credentials login form routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    const response = await startFormPost(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/2fa?mode=credentials");
    expect(response.cookies.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value).toBe(
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
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/complete");
    expect(response.cookies.get(LOGIN_PENDING_TOKEN_COOKIE)?.value).toBe("login-token-1234567890");
  });

  it("start-form redirects to login on invalid credentials", async () => {
    const { InvalidCredentialsError } = await import("@/server/services/auth-login-service");
    mocks.startCredentialsLogin.mockRejectedValue(new InvalidCredentialsError());

    const response = await startFormPost(
      formRequest("http://localhost:3000/api/auth/login/start-form", {
        email: "user@example.com",
        password: "wrongpass",
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=invalid_credentials"
    );
  });

  it("verify-2fa-form redirects to complete on success", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === TWO_FACTOR_LOGIN_CHALLENGE_COOKIE
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token-1234567890" });

    const response = await verify2faFormPost(
      formRequest("http://localhost:3000/api/auth/login/verify-2fa-form", {
        code: "123456",
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login/complete");
    expect(response.cookies.get(LOGIN_PENDING_TOKEN_COOKIE)?.value).toBe("login-token-1234567890");
    expect(response.cookies.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value).toBe("");
  });

  it("complete returns the pending login token once", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === LOGIN_PENDING_TOKEN_COOKIE ? { value: "login-token-1234567890" } : undefined
    );

    const response = await completePost();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ loginToken: "login-token-1234567890" });
    expect(response.cookies.get(LOGIN_PENDING_TOKEN_COOKIE)?.value).toBe("");
  });

  it("complete rejects missing pending login tokens", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const response = await completePost();
    expect(response.status).toBe(401);
  });

  it("complete rejects short pending login tokens", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === LOGIN_PENDING_TOKEN_COOKIE ? { value: "short" } : undefined
    );
    const response = await completePost();
    expect(response.status).toBe(401);
  });
});
