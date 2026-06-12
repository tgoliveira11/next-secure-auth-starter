import { NextResponse } from "next/server";
import { requireSessionUser } from "@/modules/auth/lib/session";
import { apiError } from "@/lib/api-helpers";
import type { SecureAuthServices } from "@/core/types";

async function passkeysListGet(services: SecureAuthServices) {
  try {
    const user = await requireSessionUser(services);
    const passkeys = await services.passkeyAccountService.listPasskeys(user.id);
    return NextResponse.json({ passkeys });
  } catch (error) {
    return apiError(error, "GET /api/account/passkeys");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => passkeysListGet(services);
}
