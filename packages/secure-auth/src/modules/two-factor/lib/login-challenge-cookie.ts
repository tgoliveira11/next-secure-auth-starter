import { APP_SLUG } from "@/lib/brand";
import { TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS } from "./constants";

export const TWO_FACTOR_LOGIN_CHALLENGE_COOKIE = `${APP_SLUG}-2fa-challenge`;

export function getLoginChallengeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
  response.cookies.set(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE, "", {
    ...getLoginChallengeCookieOptions(),
    maxAge: 0,
  });
}
