import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireVerifiedFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function sessionsListGet(services: SecureAuthServices) {
  try {
    const user = await requireVerifiedFullyAuthenticatedUser(services);
    const result = await services.accountSessionService.listSessions(
      user.id,
      user.accountSessionId
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "GET /api/account/sessions");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => sessionsListGet(services);
}
