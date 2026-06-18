import { NextResponse } from "next/server";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { apiError } from "@/lib/api-helpers";
import type { SecureAuthServices } from "@/core/types";
import type { RouteContext } from "../../create-routes.js";

async function passkeysDelete(
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
    const result = await services.passkeyAccountService.removePasskey(user.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "DELETE /api/account/passkeys/:id");
  }
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (_request: Request, context?: RouteContext) => passkeysDelete(_request, context, services);
}
