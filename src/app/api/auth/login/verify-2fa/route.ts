import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { twoFactorLoginVerifySchema } from "@/lib/validation/two-factor";
import {
  authLoginService,
  InvalidTwoFactorChallengeError,
  InvalidTwoFactorCodeError,
} from "@/server/services/auth-login-service";
import {
  clearLoginChallengeCookie,
  TWO_FACTOR_LOGIN_CHALLENGE_COOKIE,
} from "@/modules/two-factor/lib/login-challenge-cookie";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const parsed = twoFactorLoginVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const challengeToken =
      parsed.data.challengeToken ?? cookieStore.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value;
    if (!challengeToken) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await authLoginService.verifyTwoFactorLogin(
      challengeToken,
      { code: parsed.data.code, backupCode: parsed.data.backupCode },
      getClientIp(request)
    );
    const response = NextResponse.json(result);
    clearLoginChallengeCookie(response);
    return response;
  } catch (error) {
    if (error instanceof InvalidTwoFactorChallengeError) {
      const response = NextResponse.json({ error: error.message }, { status: 401 });
      clearLoginChallengeCookie(response);
      return response;
    }
    if (error instanceof InvalidTwoFactorCodeError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return apiError(error, "POST /api/auth/login/verify-2fa");
  }
}
