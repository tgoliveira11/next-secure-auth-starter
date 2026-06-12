import { getAppSlug, resolveCookieSecure } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { buildTwoFactorLoginChallengeCookieName } from "@/modules/auth/lib/auth-cookie-names.js";
import { TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS } from "./constants";

export function getTwoFactorLoginChallengeCookieName(config: SecureAuthConfig): string {
  return buildTwoFactorLoginChallengeCookieName(getAppSlug(config));
}

export function getLoginChallengeCookieOptions(config: SecureAuthConfig) {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(config),
    sameSite: "lax" as const,
    maxAge: Math.floor(TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS / 1000),
    path: "/",
  };
}

export function clearLoginChallengeCookie(
  config: SecureAuthConfig,
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options: ReturnType<typeof getLoginChallengeCookieOptions>
      ) => void;
    };
  }
) {
  response.cookies.set(getTwoFactorLoginChallengeCookieName(config), "", {
    ...getLoginChallengeCookieOptions(config),
    maxAge: 0,
  });
}
