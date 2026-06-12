import { getAppSlug } from "@/core/app-brand";
import { resolveCookieSecure } from "@/core/config-resolvers";
import { buildTwoFactorLoginChallengeCookieName } from "@/modules/auth/lib/auth-cookie-names.js";
import { TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS } from "./constants";

export function getTwoFactorLoginChallengeCookieName(): string {
  return buildTwoFactorLoginChallengeCookieName(getAppSlug());
}

export function getLoginChallengeCookieOptions() {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: "lax" as const,
    maxAge: Math.floor(TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS / 1000),
    path: "/",
  };
}

export function clearLoginChallengeCookie(response: {
  cookies: {
    set: (
      name: string,
      value: string,
      options: ReturnType<typeof getLoginChallengeCookieOptions>
    ) => void;
  };
}) {
  response.cookies.set(getTwoFactorLoginChallengeCookieName(), "", {
    ...getLoginChallengeCookieOptions(),
    maxAge: 0,
  });
}