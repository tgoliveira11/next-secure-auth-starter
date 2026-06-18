import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

async function changePasswordPost(request: Request, services: SecureAuthServices) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["POST"]));
    assertPasswordNotInUrl(request.url);

    const session = await requireVerifiedMutatingAccountUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.accountAuthService.changePassword(
      session.id,
      parsed.data,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apiError(error, "POST /api/account/change-password");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => changePasswordPost(request, services);
}
