import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { MAGIC_LINK_INVALID_MESSAGE } from "@/modules/auth/services/magic-link-service";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  token: z.string().min(16),
});

type MagicLinkLoginResult =
  | { requiresTwoFactor: true; challengeToken: string }
  | { requiresTwoFactor: false; loginToken: string; redirectTo: string };

function isMagicLinkEnabled(services: SecureAuthServices): boolean {
  return services.config.auth.magicLink?.enabled === true;
}

function jsonWithCookies(
  services: SecureAuthServices,
  body: Record<string, unknown>,
  loginResult: MagicLinkLoginResult
) {
  const response = NextResponse.json(body, { status: 200 });

  if (loginResult.requiresTwoFactor) {
    response.cookies.set(
      services.ctx.getTwoFactorLoginChallengeCookieName(),
      loginResult.challengeToken,
      services.ctx.getLoginChallengeCookieOptions()
    );
    services.ctx.clearLoginPendingTokenCookie(response);
    return response;
  }

  response.cookies.set(
    services.ctx.getLoginPendingTokenCookieName(),
    loginResult.loginToken,
    services.ctx.getLoginPendingTokenCookieOptions()
  );
  services.ctx.clearLoginChallengeCookie(response);
  return response;
}

async function verifyAndSignIn(rawToken: string, request: Request, services: SecureAuthServices) {
  const verified = await services.magicLinkService.verifyMagicLink(rawToken);
  if (!verified) {
    return { ok: false as const };
  }

  const ip = getClientIp(request, services.config);
  const userAgent = request.headers.get("user-agent") ?? undefined;
  const loginResult = await services.magicLinkService.completeMagicLinkSignIn(
    verified.userId,
    ip,
    {
      userAgent,
      ipMasked: services.ctx.maskIp(ip),
    }
  );
  return { ok: true as const, loginResult };
}

async function magicLinkVerifyPost(request: Request, services: SecureAuthServices) {
  if (!isMagicLinkEnabled(services)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await verifyAndSignIn(parsed.data.token, request, services);
    if (!result.ok) {
      return NextResponse.json({ error: MAGIC_LINK_INVALID_MESSAGE }, { status: 400 });
    }

    if (result.loginResult.requiresTwoFactor) {
      return jsonWithCookies(services, { requiresTwoFactor: true }, result.loginResult);
    }

    return jsonWithCookies(
      services,
      { redirectTo: result.loginResult.redirectTo },
      result.loginResult
    );
  } catch (error) {
    return apiError(error, "POST /api/auth/magic-link/verify");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => magicLinkVerifyPost(request, services);
}
