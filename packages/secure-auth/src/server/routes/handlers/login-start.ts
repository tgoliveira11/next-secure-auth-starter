import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { credentialsLoginStartSchema } from "@/lib/validation/two-factor";
import { InvalidCredentialsError } from "@/modules/auth/services/auth-login-service";
import type { SecureAuthServices } from "@/core/types";

async function loginStartPost(request: Request, services: SecureAuthServices) {
  const { ctx, authLoginService } = services;

  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const body = await parseJsonBody(request);
    const parsed = credentialsLoginStartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await authLoginService.startCredentialsLogin(
      parsed.data.email,
      parsed.data.password,
      getClientIp(request)
    );

    const response = NextResponse.json(result);
    if (result.requiresTwoFactor) {
      response.cookies.set(
        ctx.getTwoFactorLoginChallengeCookieName(),
        result.challengeToken,
        ctx.getLoginChallengeCookieOptions()
      );
    } else {
      ctx.clearLoginChallengeCookie(response);
    }
    return response;
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof InvalidCredentialsError) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/start");
  }
}

export function createLoginStartPostHandler(services: SecureAuthServices) {
  return (request: Request) => loginStartPost(request, services);
}
