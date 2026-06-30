import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { DEFAULT_AUTH_PATHS } from "../modules/ui/pages/types.js";
import { DEFAULT_TEST_PUBLIC_AUTH } from "./helpers/default-public-auth.js";
import {
  buildMiddlewareConfig,
  buildMiddlewareConfigFromUi,
  createSecureAuthMiddleware,
} from "../next/middleware/create-secure-auth-middleware.js";
import { buildTestSecureAuthConfig } from "./helpers/create-test-secure-auth.js";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken,
}));

const baseMiddlewareConfig = {
  paths: DEFAULT_AUTH_PATHS,
  auth: DEFAULT_TEST_PUBLIC_AUTH,
  nextAuthSecret: "test-secret",
};

describe("secure auth middleware branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rewrites login form POST to start-form handler", async () => {
    const middleware = createSecureAuthMiddleware(baseMiddlewareConfig);
    const request = new NextRequest("http://localhost:3001/login", { method: "POST" });

    const response = await middleware(request);

    expect(response.headers.get("x-middleware-rewrite")).toContain("/api/auth/login/start-form");
  });

  it("rewrites 2FA form POST to verify-2fa-form handler", async () => {
    const middleware = createSecureAuthMiddleware(baseMiddlewareConfig);
    const request = new NextRequest("http://localhost:3001/login/2fa", { method: "POST" });

    const response = await middleware(request);

    expect(response.headers.get("x-middleware-rewrite")).toContain(
      "/api/auth/login/verify-2fa-form"
    );
  });

  it("allows pending 2FA on login and api auth routes", async () => {
    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    const middleware = createSecureAuthMiddleware(baseMiddlewareConfig);

    const apiResponse = await middleware(new NextRequest("http://localhost:3001/api/auth/session"));
    expect(apiResponse.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from 2FA page", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorVerified: true,
      twoFactorPending: false,
    });
    const middleware = createSecureAuthMiddleware(baseMiddlewareConfig);

    const response = await middleware(new NextRequest("http://localhost:3001/login/2fa"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects unauthenticated admin requests to login with callback", async () => {
    getToken.mockResolvedValue(null);
    const middleware = createSecureAuthMiddleware({
      ...baseMiddlewareConfig,
      adminPath: "/admin",
    });

    const response = await middleware(new NextRequest("http://localhost:3001/admin/users"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("location")).toContain("callbackUrl=%2Fadmin%2Fusers");
  });

  it("allows authenticated users on admin routes", async () => {
    getToken.mockResolvedValue({
      sub: "user-1",
      twoFactorVerified: true,
      twoFactorPending: false,
    });
    const middleware = createSecureAuthMiddleware({
      ...baseMiddlewareConfig,
      adminPath: "/admin",
    });

    const response = await middleware(new NextRequest("http://localhost:3001/admin"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("invokes onTrace for redirects and rewrites", async () => {
    const onTrace = vi.fn();
    const middleware = createSecureAuthMiddleware({
      ...baseMiddlewareConfig,
      onTrace,
    });

    await middleware(new NextRequest("http://localhost:3001/login", { method: "POST" }));
    expect(onTrace).toHaveBeenCalledWith(
      "middleware_rewrite_form_post",
      expect.objectContaining({ path: "/login" })
    );

    getToken.mockResolvedValue({ twoFactorPending: true, twoFactorVerified: false });
    await middleware(new NextRequest("http://localhost:3001/dashboard"));
    expect(onTrace).toHaveBeenCalledWith(
      "middleware_redirect_pending_2fa",
      expect.objectContaining({ from: "/dashboard" })
    );
  });
});

describe("middleware config builders", () => {
  it("buildMiddlewareConfig includes admin path when enabled", () => {
    const config = buildTestSecureAuthConfig({
      admin: { enabled: true, path: "/ops" },
    });
    const uiConfig = {
      paths: DEFAULT_AUTH_PATHS,
      auth: DEFAULT_TEST_PUBLIC_AUTH,
    } as never;

    expect(buildMiddlewareConfig(config, uiConfig).adminPath).toBe("/ops");
  });

  it("buildMiddlewareConfigFromUi omits admin path", () => {
    const uiConfig = {
      paths: DEFAULT_AUTH_PATHS,
      auth: DEFAULT_TEST_PUBLIC_AUTH,
    } as never;

    const result = buildMiddlewareConfigFromUi(uiConfig, "secret");
    expect(result.nextAuthSecret).toBe("secret");
    expect(result.adminPath).toBeUndefined();
  });
});
