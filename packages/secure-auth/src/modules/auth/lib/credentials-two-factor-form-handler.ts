import { cookies } from "next/headers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  authLoginService,
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/modules/auth/services/auth-login-service";
import {
  clearLoginChallengeCookie,
  getTwoFactorLoginChallengeCookieName,
} from "@/modules/two-factor/lib/login-challenge-cookie";
import {
  getLoginPendingTokenCookieOptions,
  getLoginPendingTokenCookieName,
} from "@/modules/auth/lib/login-pending-cookie";
import { authTraceRedirect } from "@/modules/auth/lib/auth-trace";

export async function handleCredentialsTwoFactorFormPost(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = twoFactorLoginVerifySchema.safeParse({
      code: String(formData.get("code") ?? "").trim() || undefined,
      backupCode: String(formData.get("backupCode") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return authTraceRedirect(
        request,
        "/login/2fa?mode=credentials&error=invalid_request",
        "2fa_form_invalid_payload"
      );
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(getTwoFactorLoginChallengeCookieName())?.value;
    if (!challengeToken) {
      return authTraceRedirect(
        request,
        "/login?error=expired_challenge",
        "2fa_form_missing_challenge_cookie",
        { challengePresent: false }
      );
    }

    const result = await authLoginService.verifyTwoFactorLogin(
      challengeToken,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request)
    );

    const response = authTraceRedirect(request, "/login/complete", "2fa_form_verified", {
      pendingLoginCookieSet: true,
    });
    clearLoginChallengeCookie(response);
    response.cookies.set(
      getLoginPendingTokenCookieName(),
      result.loginToken,
      getLoginPendingTokenCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof InvalidTwoFactorChallengeError) {
      const response = authTraceRedirect(
        request,
        "/login?error=expired_challenge",
        "2fa_form_expired_challenge"
      );
      clearLoginChallengeCookie(response);
      return response;
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return authTraceRedirect(
        request,
        "/login/2fa?mode=credentials&error=invalid_code",
        "2fa_form_invalid_code"
      );
    }
    return authTraceRedirect(
      request,
      "/login/2fa?mode=credentials&error=unavailable",
      "2fa_form_unavailable"
    );
  }
}