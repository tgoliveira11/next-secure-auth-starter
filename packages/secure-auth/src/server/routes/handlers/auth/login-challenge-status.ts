import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { traceAuth } from "@/modules/auth/lib/auth-trace";
import { getTwoFactorLoginChallengeCookieName } from "@/modules/two-factor/lib/login-challenge-cookie";

export async function GET() {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(getTwoFactorLoginChallengeCookieName())?.value;
  const pending = typeof challengeToken === "string" && challengeToken.length >= 16;

  traceAuth("challenge_status", { pending });

  return NextResponse.json({ pending });
}