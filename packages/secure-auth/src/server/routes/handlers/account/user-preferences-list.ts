import { NextResponse } from "next/server";
import { requireVerifiedFullyAuthenticatedUser } from "@/modules/auth/lib/session.js";
import { getClientIp } from "@/modules/security/ip/request-ip.js";
import type { SecureAuthServices } from "@/core/types.js";
import {
  handleUserPreferencesError,
  readPreferencesNamespaceParam,
} from "./user-preferences-shared.js";

async function preferencesListGet(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedFullyAuthenticatedUser(services);
    const namespace = readPreferencesNamespaceParam(request, services.config.app.slug);
    const result = await services.userPreferencesService.list(
      user.id,
      namespace,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "GET /api/account/preferences");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => preferencesListGet(request, services);
}
