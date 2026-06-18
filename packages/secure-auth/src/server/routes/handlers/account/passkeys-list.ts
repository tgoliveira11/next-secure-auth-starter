import { NextResponse } from "next/server";
import { requireVerifiedFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import { apiError } from "@/lib/api-helpers";
import type { SecureAuthServices } from "@/core/types";

async function passkeysListGet(services: SecureAuthServices) {
  try {
    const user = await requireVerifiedFullyAuthenticatedUser(services);
    const passkeys = await services.passkeyAccountService.listPasskeys(user.id);
    return NextResponse.json({ passkeys });
  } catch (error) {
    return apiError(error, "GET /api/account/passkeys");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => passkeysListGet(services);
}
