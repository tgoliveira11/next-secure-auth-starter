import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  action: z.enum(["options", "verify"]),
  response: z.unknown().optional(),
  friendlyName: z.string().max(120).optional(),
});

async function passkeysRegisterPost(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireSessionUser(services);
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip = getClientIp(request);

    if (parsed.data.action === "options") {
      const options = await services.passkeyAccountService.getRegistrationOptions(
        user.id,
        user.email,
        ip
      );
      return NextResponse.json(options);
    }

    if (!parsed.data.response) {
      return NextResponse.json({ error: "Missing registration response" }, { status: 400 });
    }

    const result = await services.passkeyAccountService.verifyRegistration(
      user.id,
      parsed.data.response as Parameters<
        SecureAuthServices["passkeyAccountService"]["verifyRegistration"]
      >[1],
      {
        friendlyName: parsed.data.friendlyName,
      }
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "POST /api/account/passkeys/register");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => passkeysRegisterPost(request, services);
}
