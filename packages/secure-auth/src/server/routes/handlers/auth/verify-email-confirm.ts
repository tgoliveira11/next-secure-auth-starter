import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  token: z.string().min(1),
});

async function verifyEmailConfirmPost(request: Request, services: SecureAuthServices) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.accountAuthService.confirmEmailVerification(
      parsed.data.token,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/auth/verify-email/confirm");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => verifyEmailConfirmPost(request, services);
}
