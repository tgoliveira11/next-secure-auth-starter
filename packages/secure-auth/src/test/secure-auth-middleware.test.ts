import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DEFAULT_AUTH_PATHS } from "../modules/ui/pages/types.js";
import { DEFAULT_TEST_PUBLIC_AUTH } from "./helpers/default-public-auth.js";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const { createSecureAuthMiddleware } = await import(
  "../next/middleware/create-secure-auth-middleware.js"
);

const middleware = createSecureAuthMiddleware({
  paths: DEFAULT_AUTH_PATHS,
  auth: DEFAULT_TEST_PUBLIC_AUTH,
  nextAuthSecret: "test-secret",
});

describe("createSecureAuthMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects fully authenticated users away from login", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorVerified: true,
      twoFactorPending: false,
    });
    const response = await middleware(new NextRequest("http://localhost:3001/login"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows unauthenticated users to reach login", async () => {
    getToken.mockResolvedValue(null);
    const response = await middleware(new NextRequest("http://localhost:3001/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects pending 2FA sessions away from protected routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const response = await middleware(new NextRequest("http://localhost:3001/settings/account"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login/2fa");
  });

  it("redirects email verification required sessions to check-email", async () => {
    getToken.mockResolvedValue({
      emailVerificationRequired: true,
      email: "user@example.com",
    });
    const response = await middleware(new NextRequest("http://localhost:3001/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/check-email");
    expect(response.headers.get("location")).toContain("required=1");
  });

  it("redirects authenticated users away from login complete", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorVerified: true,
      twoFactorPending: false,
    });
    const response = await middleware(new NextRequest("http://localhost:3001/login/complete"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("can opt out of guest redirects", async () => {
    const guestAllowed = createSecureAuthMiddleware({
      paths: DEFAULT_AUTH_PATHS,
      auth: DEFAULT_TEST_PUBLIC_AUTH,
      nextAuthSecret: "test-secret",
      redirectAuthenticatedFromGuestPages: false,
    });
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorVerified: true,
      twoFactorPending: false,
    });
    const response = await guestAllowed(new NextRequest("http://localhost:3001/login"));
    expect(response.headers.get("location")).toBeNull();
  });
});
