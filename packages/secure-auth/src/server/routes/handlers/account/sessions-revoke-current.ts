import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import type { SecureAuthServices } from "@/core/types";

async function sessionsRevokeCurrentPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const result = await services.accountSessionService.revokeCurrentSession(
      user.id,
      user.accountSessionId
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-current");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => sessionsRevokeCurrentPost(request, services);
}
