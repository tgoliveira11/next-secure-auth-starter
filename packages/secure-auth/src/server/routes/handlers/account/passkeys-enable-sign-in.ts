import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { containsSensitivePrfMaterial } from "@/modules/passkeys/lib/webauthn-response-privacy";
import type { SecureAuthServices } from "@/core/types";
import type { RouteContext } from "../../create-routes.js";

const bodySchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
});

async function passkeysEnableSignInPost(
  request: Request,
  context: RouteContext | undefined,
  services: SecureAuthServices
) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { id: rawId } = await context.params;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const body = await parseJsonBody(request);
    if (containsSensitivePrfMaterial(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const ip = getClientIp(request, services.config);

    if (parsed.data.action === "options") {
      return NextResponse.json(
        await services.passkeyAccountService.getSignInCapabilityOptions(user.id, id, ip)
      );
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return NextResponse.json(
      await services.passkeyAccountService.verifySignInCapability(
        user.id,
        id,
        parsed.data.response as Parameters<
          SecureAuthServices["passkeyAccountService"]["verifySignInCapability"]
        >[2],
        ip
      )
    );
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/:id/enable-sign-in");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) =>
    passkeysEnableSignInPost(request, context, services);
}
