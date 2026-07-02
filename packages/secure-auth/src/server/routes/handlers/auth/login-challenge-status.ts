import { NextResponse } from "next/server";
import { getPendingTwoFactorLoginState } from "@/modules/auth/lib/pending-two-factor-login-email";
import type { SecureAuthServices } from "@/core/types";

async function loginChallengeStatusGet(services: SecureAuthServices) {
  const { pending, email } = await getPendingTwoFactorLoginState(services);

  services.ctx.authTrace.traceAuth("challenge_status", { pending });

  if (!pending) {
    return NextResponse.json({ pending: false });
  }

  return NextResponse.json({
    pending: true,
    ...(email !== undefined ? { email } : {}),
  });
}

export function createGetHandler(services: SecureAuthServices) {
  return () => loginChallengeStatusGet(services);
}
