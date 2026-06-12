import { getAppSlug, resolveCookieSecure } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { buildLoginPendingTokenCookieName } from "./auth-cookie-names.js";
import { TWO_FACTOR_LOGIN_TOKEN_TTL_MS } from "@/modules/two-factor/lib/constants";

export function getLoginPendingTokenCookieName(config: SecureAuthConfig): string {
  return buildLoginPendingTokenCookieName(getAppSlug(config));
}

export function getLoginPendingTokenCookieOptions(config: SecureAuthConfig) {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(config),
    sameSite: "lax" as const,
    maxAge: Math.floor(TWO_FACTOR_LOGIN_TOKEN_TTL_MS / 1000),
    path: "/",
  };
}

export function clearLoginPendingTokenCookie(
  config: SecureAuthConfig,
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options: ReturnType<typeof getLoginPendingTokenCookieOptions>
      ) => void;
    };
  }
) {
  response.cookies.set(getLoginPendingTokenCookieName(config), "", {
    ...getLoginPendingTokenCookieOptions(config),
    maxAge: 0,
  });
}
