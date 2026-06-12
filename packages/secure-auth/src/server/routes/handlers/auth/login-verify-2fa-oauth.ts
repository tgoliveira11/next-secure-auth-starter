import { NextResponse } from "next/server";
import { getSessionUser } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { twoFactorVerifySchema } from "@/lib/validation/two-factor";
import { InvalidTwoFactorCodeError } from "@/modules/auth/services/auth-login-service";
import type { SecureAuthServices } from "@/core/types";

async function loginVerify2faOauthPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await getSessionUser(services);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const enabled = await services.twoFactorService.isEnabledForUser(user.id);
    if (!enabled) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled" }, { status: 400 });
    }

    const body = await parseJsonBody(request);
    const parsed = twoFactorVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.authLoginService.verifyOAuthTwoFactor(
      user.id,
      parsed.data,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidTwoFactorCodeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/verify-2fa-oauth");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => loginVerify2faOauthPost(request, services);
}
