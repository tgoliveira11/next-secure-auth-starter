import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

async function resetPasswordPost(request: Request, services: SecureAuthServices) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const body = await parseJsonBody(request);
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.accountAuthService.resetPassword(
      parsed.data.token,
      parsed.data.newPassword,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apiError(error, "POST /api/auth/reset-password");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => resetPasswordPost(request, services);
}
