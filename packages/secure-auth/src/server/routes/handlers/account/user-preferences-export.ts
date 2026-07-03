import { NextResponse } from "next/server";
import { requireVerifiedFullyAuthenticatedUser } from "@/modules/auth/lib/session.js";
import { getClientIp } from "@/modules/security/ip/request-ip.js";
import type { SecureAuthServices } from "@/core/types.js";
import { handleUserPreferencesError } from "./user-preferences-shared.js";

async function preferencesExportGet(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedFullyAuthenticatedUser(services);
    const result = await services.userPreferencesService.exportAll(
      user.id,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "GET /api/account/preferences/export");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => preferencesExportGet(request, services);
}
