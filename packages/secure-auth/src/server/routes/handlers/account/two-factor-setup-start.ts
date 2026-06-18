import { NextResponse } from "next/server";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { apiError } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

async function twoFactorSetupStartPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const setup = await services.twoFactorService.startSetup(user.id, getClientIp(request));
    return NextResponse.json({
      qrCodeDataUrl: setup.qrCodeDataUrl,
      manualSetupKey: setup.manualSetupKey,
      issuer: setup.issuer,
      accountLabel: setup.accountLabel,
    });
  } catch (error) {
    return apiError(error, "POST /api/account/2fa/setup/start");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => twoFactorSetupStartPost(request, services);
}
