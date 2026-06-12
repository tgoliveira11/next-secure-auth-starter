import { describe, it, expect, vi, beforeEach } from "vitest";
import { initSecureAuthRuntime } from "@/core/secure-auth-runtime";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieOptions,
} from "@/modules/auth/lib/login-pending-cookie";
import { buildLoginPendingTokenCookieName } from "@/modules/auth/lib/auth-cookie-names";

describe("login pending cookie helpers", () => {
  beforeEach(() => {
    initSecureAuthRuntime(buildTestSecureAuthConfig());
  });

  it("clears the pending login cookie", () => {
    const set = vi.fn();
    clearLoginPendingTokenCookie({ cookies: { set } });
    expect(set).toHaveBeenCalledWith(buildLoginPendingTokenCookieName("test-app"), "", {
      ...getLoginPendingTokenCookieOptions(),
      maxAge: 0,
    });
  });
});
