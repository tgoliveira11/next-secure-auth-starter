import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import { apiError } from "@/lib/api-helpers";
import type { SecureAuthServices } from "@/core/types";

async function twoFactorStatusGet(services: SecureAuthServices) {
  try {
    const user = await requireFullyAuthenticatedUser(services);
    const status = await services.twoFactorService.getStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/2fa/status");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => twoFactorStatusGet(services);
}
