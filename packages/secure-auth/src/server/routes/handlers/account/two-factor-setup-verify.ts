import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { totpCodeSchema } from "@/lib/validation/two-factor";
import type { SecureAuthServices } from "@/core/types";

const verifySetupSchema = z.object({
  code: totpCodeSchema,
});

async function twoFactorSetupVerifyPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = verifySetupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.twoFactorService.verifySetup(
      user.id,
      parsed.data.code,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/2fa/setup/verify");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => twoFactorSetupVerifyPost(request, services);
}
