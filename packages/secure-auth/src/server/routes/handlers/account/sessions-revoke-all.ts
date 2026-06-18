import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import type { SecureAuthServices } from "@/core/types";

async function sessionsRevokeAllPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const result = await services.accountSessionService.revokeAllSessions(user.id, getClientIp(request));
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-all");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => sessionsRevokeAllPost(request, services);
}
