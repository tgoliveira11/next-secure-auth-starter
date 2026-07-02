import { getAppSlug, resolveCookieSecure } from "@/core/config-accessors.js";
import type { SecureAuthConfig } from "@/core/types.js";
import { buildTwoFactorOAuthUpgradeCookieName } from "@/modules/auth/lib/auth-cookie-names.js";
import { TWO_FACTOR_SESSION_UPGRADE_TTL_MS } from "./constants";

export function getTwoFactorOAuthUpgradeCookieName(config: SecureAuthConfig): string {
  return buildTwoFactorOAuthUpgradeCookieName(getAppSlug(config));
}

export function getTwoFactorOAuthUpgradeCookieOptions(config: SecureAuthConfig) {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(config),
    sameSite: "lax" as const,
    maxAge: Math.floor(TWO_FACTOR_SESSION_UPGRADE_TTL_MS / 1000),
    path: "/",
  };
}

export function clearTwoFactorOAuthUpgradeCookie(
  config: SecureAuthConfig,
  response: {
    cookies: {
      set: (
        name: string,
        value: string,
        options: ReturnType<typeof getTwoFactorOAuthUpgradeCookieOptions>
      ) => void;
    };
  }
) {
  response.cookies.set(getTwoFactorOAuthUpgradeCookieName(config), "", {
    ...getTwoFactorOAuthUpgradeCookieOptions(config),
    maxAge: 0,
  });
}
