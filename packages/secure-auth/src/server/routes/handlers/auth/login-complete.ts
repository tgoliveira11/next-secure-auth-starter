import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function loginCompletePost(services: SecureAuthServices) {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get(services.ctx.getLoginPendingTokenCookieName())?.value;
  if (!loginToken || loginToken.length < 16) {
    return NextResponse.json({ error: "Login session expired" }, { status: 401 });
  }

  const response = NextResponse.json({ loginToken });
  services.ctx.clearLoginPendingTokenCookie(response);
  return response;
}

export function createPostHandler(services: SecureAuthServices) {
  return () => loginCompletePost(services);
}
