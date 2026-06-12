import { NextResponse } from "next/server";
import { requireSessionUser } from "@/modules/auth/lib/session";
import { passkeyAccountService } from "@/modules/passkeys/services/passkey-account-service";
import { apiError } from "@/lib/api-helpers";

import type { RouteContext } from "../../create-routes.js";

export async function DELETE(_request: Request, context?: RouteContext) {
  try {
    const user = await requireSessionUser();
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { id: rawId } = await context.params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const result = await passkeyAccountService.removePasskey(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/passkeys/:id");
  }
}