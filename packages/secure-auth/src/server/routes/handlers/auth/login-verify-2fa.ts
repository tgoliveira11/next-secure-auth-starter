import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/modules/auth/services/auth-login-service";
import type { SecureAuthServices } from "@/core/types";

/**
 * JSON 2FA verification must read the pending login challenge only from the HttpOnly
 * cookie set at login start. Accepting `challengeToken` from the request body would
 * let a cross-site attacker supply a stolen token without the browser-bound cookie,
 * weakening CSRF and session-binding guarantees.
 */
async function loginVerify2faPost(request: Request, services: SecureAuthServices) {
  const { ctx, authLoginService } = services;

  try {
    const body = await parseJsonBody(request);
    const parsed = twoFactorLoginVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(ctx.getTwoFactorLoginChallengeCookieName())?.value;
    if (!challengeToken) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await authLoginService.verifyTwoFactorLogin(
      challengeToken,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request, services.config)
    );
    const response = NextResponse.json(result);
    ctx.clearLoginChallengeCookie(response);
    return response;
  } catch (error) {
    if (error instanceof InvalidTwoFactorChallengeError) {
      const response = NextResponse.json({ error: error.message }, { status: 401 });
      ctx.clearLoginChallengeCookie(response);
      return response;
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/verify-2fa");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => loginVerify2faPost(request, services);
}
