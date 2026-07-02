import { cookies } from "next/headers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { getSessionUser } from "@/modules/auth/lib/session";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/modules/auth/services/auth-login-service";
import { DEFAULT_AUTH_PATHS } from "@/modules/ui/pages/types";
import type { SecureAuthConfig, SecureAuthServices } from "@/core/types";

function resolveAuthPaths(config: SecureAuthConfig) {
  return {
    ...DEFAULT_AUTH_PATHS,
    ...config.ui?.paths,
  };
}

function parseTwoFactorFormFields(formData: FormData) {
  return twoFactorLoginVerifySchema.safeParse({
    code: String(formData.get("code") ?? "").trim() || undefined,
    backupCode: String(formData.get("backupCode") ?? "").trim() || undefined,
  });
}

export async function handleTwoFactorFormPost(request: Request, services: SecureAuthServices) {
  const formData = await request.formData();
  const mode = String(formData.get("mode") ?? "credentials").trim();

  if (mode === "oauth") {
    return handleOAuthTwoFactorFormPost(request, services, formData);
  }

  return handleCredentialsTwoFactorFormPost(request, services, formData);
}

export async function handleCredentialsTwoFactorFormPost(
  request: Request,
  services: SecureAuthServices,
  formData?: FormData
) {
  const { ctx, authLoginService, config } = services;
  const paths = resolveAuthPaths(config);
  const body = formData ?? (await request.formData());

  try {
    const parsed = parseTwoFactorFormFields(body);
    if (!parsed.success) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.loginTwoFactor}?mode=credentials&error=invalid_request`,
        "2fa_form_invalid_payload"
      );
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(ctx.getTwoFactorLoginChallengeCookieName())?.value;
    if (!challengeToken) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.login}?error=expired_challenge`,
        "2fa_form_missing_challenge_cookie",
        { challengePresent: false }
      );
    }

    const result = await authLoginService.verifyTwoFactorLogin(
      challengeToken,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request, services.config)
    );

    const response = ctx.authTrace.authTraceRedirect(
      request,
      paths.loginComplete,
      "2fa_form_verified",
      {
        pendingLoginCookieSet: true,
      }
    );
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
        `${paths.login}?error=expired_challenge`,
        "2fa_form_expired_challenge"
      );
      ctx.clearLoginChallengeCookie(response);
      return response;
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.loginTwoFactor}?mode=credentials&error=invalid_code`,
        "2fa_form_invalid_code"
      );
    }
    return ctx.authTrace.authTraceRedirect(
      request,
      `${paths.loginTwoFactor}?mode=credentials&error=unavailable`,
      "2fa_form_unavailable"
    );
  }
}

async function handleOAuthTwoFactorFormPost(
  request: Request,
  services: SecureAuthServices,
  formData: FormData
) {
  const { ctx, authLoginService, config } = services;
  const paths = resolveAuthPaths(config);

  try {
    const parsed = parseTwoFactorFormFields(formData);
    if (!parsed.success) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.loginTwoFactor}?error=invalid_request`,
        "2fa_oauth_form_invalid_payload"
      );
    }

    const user = await getSessionUser(services);
    if (!user) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.login}?error=authentication_required`,
        "2fa_oauth_form_missing_session"
      );
    }

    const result = await authLoginService.verifyOAuthTwoFactor(
      user.id,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request, services.config)
    );

    const response = ctx.authTrace.authTraceRedirect(
      request,
      paths.loginTwoFactorOauthComplete,
      "2fa_oauth_form_verified",
      { oauthUpgradeCookieSet: true }
    );
    response.cookies.set(
      ctx.getTwoFactorOAuthUpgradeCookieName(),
      result.upgradeToken,
      ctx.getTwoFactorOAuthUpgradeCookieOptions()
    );
    return response;
  } catch (error) {
    if (error instanceof InvalidTwoFactorCodeError) {
      return ctx.authTrace.authTraceRedirect(
        request,
        `${paths.loginTwoFactor}?error=invalid_code`,
        "2fa_oauth_form_invalid_code"
      );
    }
    return ctx.authTrace.authTraceRedirect(
      request,
      `${paths.loginTwoFactor}?error=unavailable`,
      "2fa_oauth_form_unavailable"
    );
  }
}
