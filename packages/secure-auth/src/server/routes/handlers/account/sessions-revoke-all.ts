import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function sessionsRevokeAllPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireFullyAuthenticatedUser(services);
    const result = await services.accountSessionService.revokeAllSessions(user.id, getClientIp(request));
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-all");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => sessionsRevokeAllPost(request, services);
}
