import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SecureAuthServices } from "@/core/types";

async function loginChallengeStatusGet(services: SecureAuthServices) {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value;
  if (typeof challengeToken !== "string" || challengeToken.length < 16) {
    services.ctx.authTrace.traceAuth("challenge_status", { pending: false });
    return NextResponse.json({ pending: false });
  }

  const challenge = await services.repos.twoFactorRepository.peekLoginChallenge(
    services.ctx.hashOpaqueToken(challengeToken)
  );
  if (!challenge) {
    services.ctx.authTrace.traceAuth("challenge_status", { pending: false });
    return NextResponse.json({ pending: false });
  }

  const user = await services.repos.userRepository.findById(challenge.userId);
  services.ctx.authTrace.traceAuth("challenge_status", { pending: true });

  return NextResponse.json({
    pending: true,
    email: user?.email ?? undefined,
  });
}

export function createGetHandler(services: SecureAuthServices) {
  return () => loginChallengeStatusGet(services);
}
