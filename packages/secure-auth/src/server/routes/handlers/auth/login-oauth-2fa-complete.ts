import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function loginOauth2faCompletePost(services: SecureAuthServices) {
  const cookieStore = await cookies();
  const upgradeToken = cookieStore.get(services.ctx.getTwoFactorOAuthUpgradeCookieName())?.value;
  if (!upgradeToken || upgradeToken.length < 16) {
    return NextResponse.json({ error: "Two-factor session expired" }, { status: 401 });
  }

  const response = NextResponse.json({ upgradeToken });
  services.ctx.clearTwoFactorOAuthUpgradeCookie(response);
  return response;
}

export function createPostHandler(services: SecureAuthServices) {
  return () => loginOauth2faCompletePost(services);
}
