import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getToken = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

describe("middleware two-factor gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects pending 2FA sessions away from protected routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/settings/account"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login/2fa");
  });

  it("allows pending 2FA sessions to reach login and auth routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const { middleware } = await import("@/middleware");
    const login = await middleware(new NextRequest("http://localhost:3001/login/2fa"));
    const api = await middleware(new NextRequest("http://localhost:3001/api/auth/login/verify-2fa-oauth"));
    expect(login.headers.get("location")).toBeNull();
    expect(api.headers.get("location")).toBeNull();
  });

  it("passes through verified sessions", async () => {
    getToken.mockResolvedValue({ twoFactorPending: false, twoFactorVerified: true });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/settings/account"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects fully authenticated sessions away from login", async () => {
    getToken.mockResolvedValue({ sub: "user-1", twoFactorPending: false, twoFactorVerified: true });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects unverified sessions when email verification is required", async () => {
    getToken.mockResolvedValue({
      emailVerificationRequired: true,
      email: "user@example.com",
    });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/check-email");
    expect(response.headers.get("location")).toContain("required=1");
  });

  it("allows unverified sessions to reach check-email", async () => {
    getToken.mockResolvedValue({
      emailVerificationRequired: true,
      email: "user@example.com",
    });
    const { middleware } = await import("@/middleware");
    const response = await middleware(new NextRequest("http://localhost:3001/check-email"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("rewrites password-manager login form posts to the start-form API", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest("http://localhost:3001/login", {
        method: "POST",
        body: "email=user@example.com&password=password123",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3001/api/auth/login/start-form"
    );
  });

  it("rewrites password-manager 2FA form posts to the verify-form API", async () => {
    const { middleware } = await import("@/middleware");
    const response = await middleware(
      new NextRequest("http://localhost:3001/login/2fa", {
        method: "POST",
        body: "code=123456",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      })
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "http://localhost:3001/api/auth/login/verify-2fa-form"
    );
  });
});
