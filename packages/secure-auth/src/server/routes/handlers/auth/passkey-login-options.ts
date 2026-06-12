import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
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
    return apiError(error, "POST /api/auth/passkey/login/options");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => passkeyLoginOptionsPost(request, services);
}
