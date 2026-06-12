import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-helpers";
import { requireSessionUser } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

async function authStatusGet(services: SecureAuthServices) {
  try {
    const session = await requireSessionUser(services);
    const status = await services.accountAuthService.getAccountAuthStatus(session.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/auth-status");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => authStatusGet(services);
}
