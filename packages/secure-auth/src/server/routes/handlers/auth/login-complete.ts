import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearLoginPendingTokenCookie,
  LOGIN_PENDING_TOKEN_COOKIE,
} from "@/modules/auth/lib/login-pending-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const loginToken = cookieStore.get(LOGIN_PENDING_TOKEN_COOKIE)?.value;
  if (!loginToken || loginToken.length < 16) {
    return NextResponse.json({ error: "Login session expired" }, { status: 401 });
  }

  const response = NextResponse.json({ loginToken });
  clearLoginPendingTokenCookie(response);
  return response;
}
