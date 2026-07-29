import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({ receipt: z.string().min(1).max(16_384) }).strict();

async function post(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    if (!user.accountSessionId) {
      throw new UnauthorizedError("Active account session required");
    }
    const parsed = bodySchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json(
      await services.passkeyGrantService.finalizeReceipt(
        { userId: user.id, accountSessionId: user.accountSessionId },
        parsed.data.receipt,
        getClientIp(request, services.config)
      )
    );
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/portable-vault-grants/finalize");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => post(request, services);
}
