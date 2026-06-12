import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/server/policies/auth-password-input";
import { credentialsLoginStartSchema } from "@/lib/validation/two-factor";
import { InvalidCredentialsError } from "@/modules/auth/services/auth-login-service";
import {
  clearLoginChallengeCookie,
  getLoginChallengeCookieOptions,
  TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
} from "@/modules/two-factor/lib/login-challenge-cookie";
import type { SecureAuthServices } from "@/core/types";

async function loginStartPost(request: Request, services: SecureAuthServices) {
    try {
      assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
      assertPasswordNotInUrl(request.url);

      const body = await parseJsonBody(request);
      const parsed = credentialsLoginStartSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }

      const result = await services.authLoginService.startCredentialsLogin(
        parsed.data.email,
        parsed.data.password,
        getClientIp(request)
      );

      const response = NextResponse.json(result);
      if (result.requiresTwoFactor) {
        response.cookies.set(
          TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
          result.challengeToken,
          getLoginChallengeCookieOptions()
        );
      } else {
        clearLoginChallengeCookie(response);
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

/** Direct handler for tests and lazy route loading. */
export async function POST(request: Request) {
  const { authLoginService } = await import("@/server/services/auth-login-service");
  const { getSecureAuthConfig } = await import("@/core/auth-config-store");
  const config = getSecureAuthConfig();
  return loginStartPost(request, {
    config,
    db: config.db,
    authLoginService,
  } as SecureAuthServices);
}
