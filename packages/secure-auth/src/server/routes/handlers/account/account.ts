import { NextResponse } from "next/server";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getClientIp } from "@/modules/security/ip/request-ip";
import {
  assertAuthPasswordRequestMethod,
  assertPasswordNotInUrl,
  AuthPasswordTransportError,
} from "@/modules/security/policies/auth-password-input";
import { z } from "zod";
import type { SecureAuthServices } from "@/core/types";
import type { RouteContext } from "../../create-routes.js";

const deleteSchema = z.object({
  confirmationPhrase: z.string(),
  password: z.string().optional(),
});

async function accountGet(services: SecureAuthServices) {
  try {
    const session = await requireFullyAuthenticatedUser(services);
    const requirements = await services.accountService.getDeletionRequirements(session.id);
    return NextResponse.json(requirements);
  } catch (error) {
    return apiError(error, "GET /api/account");
  }
}

async function accountDelete(request: Request, services: SecureAuthServices) {
  try {
    assertAuthPasswordRequestMethod(request.method, new Set(["DELETE"]));
    assertPasswordNotInUrl(request.url);

    const session = await requireFullyAuthenticatedUser(services);
    const ip = getClientIp(request);
    const body = await parseJsonBody(request);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await services.accountService.deleteAccount(session.id, parsed.data, {
      ip,
      accountSessionId: session.accountSessionId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthPasswordTransportError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return apiError(error, "DELETE /api/account");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return () => accountGet(services);
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request, _context?: RouteContext) => accountDelete(request, services);
}
