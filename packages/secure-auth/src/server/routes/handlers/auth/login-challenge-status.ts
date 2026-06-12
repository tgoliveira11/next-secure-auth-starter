import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function loginChallengeStatusGet(services: SecureAuthServices) {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value;
  const pending = typeof challengeToken === "string" && challengeToken.length >= 16;

  services.ctx.authTrace.traceAuth("challenge_status", { pending });

  return NextResponse.json({ pending });
}

export function createGetHandler(services: SecureAuthServices) {
  return () => loginChallengeStatusGet(services);
}
