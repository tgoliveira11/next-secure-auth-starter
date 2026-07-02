import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { RateLimitError } from "@/modules/rate-limit/index";
import { safeLogger } from "@/modules/security/logger/index";
import { GENERIC_FORGOT_PASSWORD_MESSAGE } from "@/modules/account/lib/account-auth-messages";
import { getDatabaseErrorHint } from "@/modules/database/lib/database-errors";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  email: z.string().email(),
});

async function forgotPasswordPost(request: Request, services: SecureAuthServices) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const result = await services.accountAuthService.requestPasswordReset(
      parsed.data.email,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return apiError(error, "POST /api/auth/forgot-password");
    }

    const migrationHint = getDatabaseErrorHint(error);
    safeLogger.error("Forgot password request failed", {
      endpoint: "POST /api/auth/forgot-password",
      error: error instanceof Error ? error.message : "unknown",
      ...(migrationHint ? { migrationHint } : {}),
    });

    return NextResponse.json({ message: GENERIC_FORGOT_PASSWORD_MESSAGE });
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => forgotPasswordPost(request, services);
}
