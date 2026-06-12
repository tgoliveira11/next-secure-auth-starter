import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
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
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/auth/forgot-password");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => forgotPasswordPost(request, services);
}
