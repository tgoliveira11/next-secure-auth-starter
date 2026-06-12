import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import { apiError } from "@/lib/api-helpers";
import { twoFactorService } from "@/modules/two-factor/services/two-factor-service";

export async function GET() {
  try {
    const user = await requireFullyAuthenticatedUser();
    const status = await twoFactorService.getStatus(user.id);
    return NextResponse.json(status);
  } catch (error) {
    return apiError(error, "GET /api/account/2fa/status");
  }
}