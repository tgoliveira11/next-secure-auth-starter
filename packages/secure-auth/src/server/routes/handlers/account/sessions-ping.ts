import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function sessionsPingPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireFullyAuthenticatedUser(services);
    if (user.accountSessionId) {
      await services.accountSessionService.enrichFromRequest(
        user.accountSessionId,
        user.id,
        request
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "POST /api/account/sessions/ping");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => sessionsPingPost(request, services);
}
