import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import { MAGIC_LINK_REQUEST_MESSAGE } from "@/modules/auth/services/magic-link-service";
import type { SecureAuthServices } from "@/core/types";

const bodySchema = z.object({
  email: z.string().email(),
});

function isMagicLinkEnabled(services: SecureAuthServices): boolean {
  return services.config.auth.magicLink?.enabled === true;
}

async function magicLinkRequestPost(request: Request, services: SecureAuthServices) {
  if (!isMagicLinkEnabled(services)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await parseJsonBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await services.magicLinkService.requestMagicLink(parsed.data.email, getClientIp(request, services.config));
    return NextResponse.json({ message: MAGIC_LINK_REQUEST_MESSAGE });
  } catch (error) {
    return apiError(error, "POST /api/auth/magic-link/request");
  }
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => magicLinkRequestPost(request, services);
}
