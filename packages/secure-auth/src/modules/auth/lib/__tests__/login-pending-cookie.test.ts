import { describe, it, expect, vi } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieOptions,
} from "@/modules/auth/lib/login-pending-cookie";
import { buildLoginPendingTokenCookieName } from "@/modules/auth/lib/auth-cookie-names";

describe("login pending cookie helpers", () => {
  it("clears the pending login cookie", () => {
    const config = buildTestSecureAuthConfig();
    const set = vi.fn();
    clearLoginPendingTokenCookie(config, { cookies: { set } });
    expect(set).toHaveBeenCalledWith(buildLoginPendingTokenCookieName("test-app"), "", {
      ...getLoginPendingTokenCookieOptions(config),
      maxAge: 0,
    });
  });
});
