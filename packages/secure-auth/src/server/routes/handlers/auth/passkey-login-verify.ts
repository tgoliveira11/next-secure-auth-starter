import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  response: z.unknown(),
});

async function passkeyLoginVerifyPost(request: Request, services: SecureAuthServices) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success || !parsed.data.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { ctx } = services;
    const result = await services.passkeyLoginService.verifyLogin(
      parsed.data.response as Parameters<SecureAuthServices["passkeyLoginService"]["verifyLogin"]>[0],
      getClientIp(request)
    );

    const response = NextResponse.json(result);
    if (result.requiresTwoFactor) {
      response.cookies.set(
        ctx.getTwoFactorLoginChallengeCookieName(),
        result.challengeToken,
        ctx.getLoginChallengeCookieOptions()
      );
      ctx.clearLoginPendingTokenCookie(response);
    } else {
      ctx.clearLoginChallengeCookie(response);
    }
    return response;
  } catch (error) {
    return apiError(error, "POST /api/auth/passkey/login/verify");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => passkeyLoginVerifyPost(request, services);
}
