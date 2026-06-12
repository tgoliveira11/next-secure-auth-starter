import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireSessionUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  email: z.string().email().optional(),
});

async function verifyEmailResendPost(request: Request, services: SecureAuthServices) {
  try {
    const ip = getClientIp(request);
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);

    if (parsed.success && parsed.data.email) {
      const result = await services.accountAuthService.resendVerificationByEmail(parsed.data.email, ip);
      return NextResponse.json(result);
    }

    const session = await requireSessionUser(services);
    const result = await services.accountAuthService.sendVerificationEmailForUser(session.id, ip);
    if (result.alreadyVerified) {
      return NextResponse.json({ message: "Your email is already verified." });
    }
    return NextResponse.json({ message: "Verification email sent." });
  } catch (error) {
    return apiError(error, "POST /api/auth/verify-email/resend");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => verifyEmailResendPost(request, services);
}
