import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function sessionsRevokeCurrentPost(services: SecureAuthServices) {
  try {
    const user = await requireFullyAuthenticatedUser(services);
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
  return () => sessionsRevokeCurrentPost(services);
}
