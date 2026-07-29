import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { UnauthorizedError } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { containsSensitivePrfMaterial } from "@/modules/passkeys/lib/webauthn-response-privacy";
import type { SecureAuthServices } from "@/core/types";

const requestId = z.string().uuid();
const response = z.unknown();
const envelopeId = z.string().uuid();
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll"), requestId, response }).strict(),
  z.object({ action: z.literal("revoke"), requestId, envelopeId, response }).strict(),
  z.object({ action: z.literal("unlock"), requestId, envelopeId, response }).strict(),
]);

async function post(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    if (!user.accountSessionId) {
      throw new UnauthorizedError("Active account session required");
    }
    const body = await parseJsonBody(request);
    if (containsSensitivePrfMaterial(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success || !parsed.data.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json(
      await services.passkeyGrantService.verifyAndIssueGrant(
        { userId: user.id, accountSessionId: user.accountSessionId },
        parsed.data as Parameters<
          SecureAuthServices["passkeyGrantService"]["verifyAndIssueGrant"]
        >[1],
        getClientIp(request, services.config)
      )
    );
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/portable-vault-grants/verify");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => post(request, services);
}
