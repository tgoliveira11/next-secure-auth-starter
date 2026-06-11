import { describe, it, expect, vi } from "vitest";
import {
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieOptions,
  LOGIN_PENDING_TOKEN_COOKIE,
} from "@/modules/auth/lib/login-pending-cookie";

describe("login pending cookie helpers", () => {
  it("clears the pending login cookie", () => {
    const set = vi.fn();
    clearLoginPendingTokenCookie({ cookies: { set } });
    expect(set).toHaveBeenCalledWith(LOGIN_PENDING_TOKEN_COOKIE, "", {
      ...getLoginPendingTokenCookieOptions(),
      maxAge: 0,
    });
  });
});
