import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function sessionsRevokeOthersPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    if (!user.accountSessionId) {
      throw new UnauthorizedError("Current session could not be identified");
    }
    const result = await services.accountSessionService.revokeOtherSessions(
      user.id,
      user.accountSessionId,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/revoke-others");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => sessionsRevokeOthersPost(request, services);
}
