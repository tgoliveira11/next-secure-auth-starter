import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleCredentialsLoginFormPost } from "@/modules/auth/lib/credentials-login-start-handler";
import { handleCredentialsTwoFactorFormPost } from "@/modules/auth/lib/credentials-two-factor-form-handler";
import { getTwoFactorLoginChallengeCookieName } from "@/modules/two-factor/lib/login-challenge-cookie";

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

vi.mock("@/modules/auth/services/auth-login-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/services/auth-login-service")>();
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
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
}

describe("credentials login form handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects invalid payloads from the login handler", async () => {
    const response = await handleCredentialsLoginFormPost(
      formRequest("http://localhost/login", { email: "bad", password: "x" })
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("invalid_request");
  });

  it("redirects password-in-url transport violations", async () => {
    const response = await handleCredentialsLoginFormPost(
      new Request("http://localhost/login?password=secret", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email: "user@example.com",
          password: "password123",
        }),
      })
    );
    expect(response.headers.get("location")).toContain("invalid_request");
  });

  it("redirects direct sign-in without 2FA to complete", async () => {
    mocks.startCredentialsLogin.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token-1234567890",
    });
    const response = await handleCredentialsLoginFormPost(
      formRequest("http://localhost/login", {
        email: "user@example.com",
        password: "password123",
      })
    );
    expect(response.headers.get("location")).toContain("/login/complete");
  });

  it("redirects invalid credentials from the login handler", async () => {
    const { InvalidCredentialsError } = await import("@/modules/auth/services/auth-login-service");
    mocks.startCredentialsLogin.mockRejectedValue(new InvalidCredentialsError());
    const response = await handleCredentialsLoginFormPost(
      formRequest("http://localhost/login", {
        email: "user@example.com",
        password: "wrongpass",
      })
    );
    expect(response.headers.get("location")).toContain("invalid_credentials");
  });

  it("redirects unavailable login failures", async () => {
    mocks.startCredentialsLogin.mockRejectedValue(new Error("db down"));
    const response = await handleCredentialsLoginFormPost(
      formRequest("http://localhost/login", {
        email: "user@example.com",
        password: "password123",
      })
    );
    expect(response.headers.get("location")).toContain("unavailable");
  });

  it("redirects expired 2FA challenges from the verify handler", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { code: "123456" })
    );
    expect(response.headers.get("location")).toContain("expired_challenge");
  });

  it("redirects invalid 2FA payloads from the verify handler", async () => {
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { code: "12" })
    );
    expect(response.headers.get("location")).toContain("invalid_request");
  });

  it("redirects consumed 2FA challenges from the verify handler", async () => {
    const { InvalidTwoFactorChallengeError } = await import("@/modules/auth/services/auth-login-service");
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockRejectedValue(new InvalidTwoFactorChallengeError());
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { code: "123456" })
    );
    expect(response.headers.get("location")).toContain("expired_challenge");
  });

  it("redirects invalid 2FA codes from the verify handler", async () => {
    const { InvalidTwoFactorCodeError } = await import("@/modules/auth/services/auth-login-service");
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockRejectedValue(new InvalidTwoFactorCodeError());
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { code: "123456" })
    );
    expect(response.headers.get("location")).toContain("invalid_code");
  });

  it("redirects unavailable 2FA failures from the verify handler", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockRejectedValue(new Error("db down"));
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { code: "123456" })
    );
    expect(response.headers.get("location")).toContain("unavailable");
  });

  it("accepts backup codes during 2FA verification", async () => {
    mocks.cookiesGet.mockImplementation((name: string) =>
      name === getTwoFactorLoginChallengeCookieName()
        ? { value: "challenge-token-1234567890" }
        : undefined
    );
    mocks.verifyTwoFactorLogin.mockResolvedValue({ loginToken: "login-token-1234567890" });
    const response = await handleCredentialsTwoFactorFormPost(
      formRequest("http://localhost/login/2fa", { backupCode: "AAAA-BBBB-CCCC" })
    );
    expect(response.headers.get("location")).toContain("/login/complete");
  });
});