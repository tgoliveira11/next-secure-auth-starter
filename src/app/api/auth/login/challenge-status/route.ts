import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { traceAuth } from "@/modules/auth/lib/auth-trace";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/modules/two-factor/lib/login-challenge-cookie";

export async function GET() {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value;
  const pending = typeof challengeToken === "string" && challengeToken.length >= 16;

  traceAuth("challenge_status", { pending });

  return NextResponse.json({ pending });
}
