import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { GENERIC_PASSKEY_LOGIN_OPTIONS_ERROR } from "@/modules/auth/lib/public-auth-messages";
import { NotFoundError } from "@/modules/passkeys/services/passkey-service";
import { ValidationError } from "@/modules/account/lib/account-errors";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  credentialId: z.string().min(1).optional(),
});

async function passkeyLoginOptionsPost(request: Request, services: SecureAuthServices) {
  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await services.passkeyLoginService.getLoginOptions({
      email: parsed.data.email,
      userId: parsed.data.userId,
      credentialId: parsed.data.credentialId,
      ip: getClientIp(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ValidationError) {
      return NextResponse.json({ error: GENERIC_PASSKEY_LOGIN_OPTIONS_ERROR }, { status: 400 });
    }
    return apiError(error, "POST /api/auth/passkey/login/options");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => passkeyLoginOptionsPost(request, services);
}
