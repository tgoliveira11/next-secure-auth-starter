import { buildTwoFactorLoginChallengeCookieName } from "@tgoliveira/secure-auth/client";
import { APP_SLUG } from "@/lib/brand";

/** Must match package cookie name for this app slug. */
export const TWO_FACTOR_LOGIN_CHALLENGE_COOKIE = buildTwoFactorLoginChallengeCookieName(APP_SLUG);
