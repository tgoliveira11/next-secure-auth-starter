import { cookies } from "next/headers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/modules/auth/services/auth-login-service";
import type { SecureAuthServices } from "@/core/types";

export async function handleCredentialsTwoFactorFormPost(
  request: Request,
  services: SecureAuthServices
) {
  const { ctx, authLoginService } = services;

  try {
    const formData = await request.formData();
    const parsed = twoFactorLoginVerifySchema.safeParse({
      code: String(formData.get("code") ?? "").trim() || undefined,
      backupCode: String(formData.get("backupCode") ?? "").trim() || undefined,
    });
    if (!parsed.success) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login/2fa?mode=credentials&error=invalid_request",
        "2fa_form_invalid_payload"
      );
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(ctx.getTwoFactorLoginChallengeCookieName())?.value;
    if (!challengeToken) {
      return ctx.authTrace.authTraceRedirect(
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

    const response = ctx.authTrace.authTraceRedirect(request, "/login/complete", "2fa_form_verified", {
      pendingLoginCookieSet: true,
    });
    ctx.clearLoginChallengeCookie(response);
    response.cookies.set(
      ctx.getLoginPendingTokenCookieName(),
      result.loginToken,
      ctx.getLoginPendingTokenCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof InvalidTwoFactorChallengeError) {
      const response = ctx.authTrace.authTraceRedirect(
        request,
        "/login?error=expired_challenge",
        "2fa_form_expired_challenge"
      );
      ctx.clearLoginChallengeCookie(response);
      return response;
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login/2fa?mode=credentials&error=invalid_code",
        "2fa_form_invalid_code"
      );
    }
    return ctx.authTrace.authTraceRedirect(
      request,
      "/login/2fa?mode=credentials&error=unavailable",
      "2fa_form_unavailable"
    );
  }
}
