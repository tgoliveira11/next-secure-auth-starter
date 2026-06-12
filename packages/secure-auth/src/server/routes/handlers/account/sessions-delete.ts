import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/lib/request-ip";
import { requireFullyAuthenticatedUser } from "@/lib/auth/session";
import { accountSessionService } from "@/server/services/account-session-service";

import type { RouteContext } from "../../create-routes.js";

export async function DELETE(request: Request, context?: RouteContext) {
  try {
    const user = await requireFullyAuthenticatedUser();
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { id: rawId } = await context.params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const result = await accountSessionService.revokeSession(
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
