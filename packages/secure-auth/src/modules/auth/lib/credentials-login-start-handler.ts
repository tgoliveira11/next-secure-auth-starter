import { getClientIp } from "@/lib/request-ip";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/server/policies/auth-password-input";
import { credentialsLoginStartSchema } from "@/lib/validation/two-factor";
import {
  authLoginService,
  InvalidCredentialsError,
} from "@/server/services/auth-login-service";
import {
  clearLoginChallengeCookie,
  getLoginChallengeCookieOptions,
  TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
} from "@/modules/two-factor/lib/login-challenge-cookie";
import {
  clearLoginPendingTokenCookie,
  getLoginPendingTokenCookieOptions,
  LOGIN_PENDING_TOKEN_COOKIE,
} from "@/modules/auth/lib/login-pending-cookie";
import { authTraceRedirect } from "@/modules/auth/lib/auth-trace";

export async function handleCredentialsLoginFormPost(request: Request) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const formData = await request.formData();
    const parsed = credentialsLoginStartSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (!parsed.success) {
      return authTraceRedirect(request, "/login?error=invalid_request", "login_form_invalid_payload");
    }

    const result = await authLoginService.startCredentialsLogin(
      parsed.data.email,
      parsed.data.password,
      getClientIp(request)
    );

    if (result.requiresTwoFactor) {
      const response = authTraceRedirect(
        request,
        "/login/2fa?mode=credentials",
        "login_form_requires_2fa",
        { challengeCookieSet: true }
      );
      response.cookies.set(
        TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
        result.challengeToken,
        getLoginChallengeCookieOptions()
      );
      clearLoginPendingTokenCookie(response);
      return response;
    }

    const response = authTraceRedirect(request, "/login/complete", "login_form_complete", {
      pendingLoginCookieSet: true,
    });
    response.cookies.set(
      LOGIN_PENDING_TOKEN_COOKIE,
      result.loginToken,
      getLoginPendingTokenCookieOptions()
    );
    clearLoginChallengeCookie(response);
    return response;
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return authTraceRedirect(request, "/login?error=invalid_request", "login_form_transport_error");
    }
    if (error instanceof InvalidCredentialsError) {
      return authTraceRedirect(
        request,
        "/login?error=invalid_credentials",
        "login_form_invalid_credentials"
      );
    }
    return authTraceRedirect(request, "/login?error=unavailable", "login_form_unavailable");
  }
}
