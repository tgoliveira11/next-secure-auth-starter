import { NextResponse } from "next/server";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { twoFactorVerifySchema } from "@/lib/validation/two-factor";
import type { SecureAuthServices } from "@/core/types";

async function twoFactorBackupCodesPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = twoFactorVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.twoFactorService.regenerateBackupCodes(
      user.id,
      parsed.data,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/2fa/backup-codes/regenerate");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => twoFactorBackupCodesPost(request, services);
}
