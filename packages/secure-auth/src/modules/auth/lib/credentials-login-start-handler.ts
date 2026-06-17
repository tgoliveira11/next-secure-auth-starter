import { getClientIp } from "@/modules/security/ip/request-ip";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { credentialsLoginStartSchema } from "@/lib/validation/two-factor";
import { InvalidCredentialsError } from "@/modules/auth/services/auth-login-service";
import { CaptchaVerificationError } from "@/modules/captcha/index";
import { verifyCaptcha } from "@/modules/captcha/services/turnstile-verifier";
import { CAPTCHA_TOKEN_FIELD } from "@/modules/captcha/lib/constants";
import type { SecureAuthServices } from "@/core/types";

export async function handleCredentialsLoginFormPost(
  request: Request,
  services: SecureAuthServices
) {
  const { config, ctx, authLoginService } = services;

  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const formData = await request.formData();
    const parsed = credentialsLoginStartSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (!parsed.success) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login?error=invalid_request",
        "login_form_invalid_payload"
      );
    }

    await verifyCaptcha({
      config,
      token: String(formData.get(CAPTCHA_TOKEN_FIELD) ?? ""),
      remoteIp: getClientIp(request),
      action: "login",
    });

    const result = await authLoginService.startCredentialsLogin(
      parsed.data.email,
      parsed.data.password,
      getClientIp(request)
    );

    if (result.requiresTwoFactor) {
      const response = ctx.authTrace.authTraceRedirect(
        request,
        "/login/2fa?mode=credentials",
        "login_form_requires_2fa",
        { challengeCookieSet: true }
      );
      response.cookies.set(
        ctx.getTwoFactorLoginChallengeCookieName(),
        result.challengeToken,
        ctx.getLoginChallengeCookieOptions()
      );
      ctx.clearLoginPendingTokenCookie(response);
      return response;
    }

    const response = ctx.authTrace.authTraceRedirect(request, "/login/complete", "login_form_complete", {
      pendingLoginCookieSet: true,
    });
    response.cookies.set(
      ctx.getLoginPendingTokenCookieName(),
      result.loginToken,
      ctx.getLoginPendingTokenCookieOptions()
    );
    ctx.clearLoginChallengeCookie(response);
    return response;
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login?error=invalid_request",
        "login_form_transport_error"
      );
    }
    if (error instanceof CaptchaVerificationError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login?error=captcha_failed",
        "login_form_captcha_failed"
      );
    }
    if (error instanceof InvalidCredentialsError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        "/login?error=invalid_credentials",
        "login_form_invalid_credentials"
      );
    }
    return ctx.authTrace.authTraceRedirect(request, "/login?error=unavailable", "login_form_unavailable");
  }
}
