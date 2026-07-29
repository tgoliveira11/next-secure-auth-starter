import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const credentialDbId = z.string().uuid();
const envelopeId = z.string().uuid();
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll"), credentialDbId }).strict(),
  z.object({ action: z.literal("revoke"), credentialDbId, envelopeId }).strict(),
  z
    .object({
      action: z.literal("unlock"),
      credentialDbId,
      envelopeId,
      ephemeralPublicKeyJwk: z
      .object({
        kty: z.literal("EC"),
        crv: z.literal("P-256"),
        x: z.string().min(1).max(128),
        y: z.string().min(1).max(128),
      })
      .strict(),
    })
    .strict(),
]);

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
      await services.passkeyGrantService.getOptions(
        { userId: user.id, accountSessionId: user.accountSessionId },
        parsed.data,
        getClientIp(request, services.config)
      )
    );
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/portable-vault-grants/options");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => post(request, services);
}
