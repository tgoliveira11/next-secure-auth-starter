import { APP_SLUG } from "../../../lib/brand.js";
import { TWO_FACTOR_LOGIN_TOKEN_TTL_MS } from "@/modules/two-factor/lib/constants";

export const LOGIN_PENDING_TOKEN_COOKIE = `${APP_SLUG}-login-pending`;

export function getLoginPendingTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
  response.cookies.set(LOGIN_PENDING_TOKEN_COOKIE, "", {
    ...getLoginPendingTokenCookieOptions(),
    maxAge: 0,
  });
}
