import { getAppSlug } from "@/core/app-brand";
import { resolveCookieSecure } from "@/core/config-resolvers";
import { buildLoginPendingTokenCookieName } from "./auth-cookie-names.js";
import { TWO_FACTOR_LOGIN_TOKEN_TTL_MS } from "@/modules/two-factor/lib/constants";

export function getLoginPendingTokenCookieName(): string {
  return buildLoginPendingTokenCookieName(getAppSlug());
}

export function getLoginPendingTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: resolveCookieSecure(),
    sameSite: "lax" as const,
    maxAge: Math.floor(TWO_FACTOR_LOGIN_TOKEN_TTL_MS / 1000),
    path: "/",
  };
}

export function clearLoginPendingTokenCookie(response: {
  cookies: {
    set: (
      name: string,
      value: string,
      options: ReturnType<typeof getLoginPendingTokenCookieOptions>
    ) => void;
  };
}) {
  response.cookies.set(getLoginPendingTokenCookieName(), "", {
    ...getLoginPendingTokenCookieOptions(),
    maxAge: 0,
  });
}