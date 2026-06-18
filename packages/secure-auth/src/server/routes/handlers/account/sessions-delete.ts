import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import type { SecureAuthServices } from "@/core/types";
import type { RouteContext } from "../../create-routes.js";

async function sessionsDelete(
  request: Request,
  context: RouteContext | undefined,
  services: SecureAuthServices
) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { id: rawId } = await context.params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const result = await services.accountSessionService.revokeSession(
      user.id,
      id,
      user.accountSessionId,
      getClientIp(request)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/sessions/:id");
  }
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) => sessionsDelete(request, context, services);
}
