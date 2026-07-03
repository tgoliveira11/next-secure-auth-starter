import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-helpers.js";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth.js";
import { requireVerifiedFullyAuthenticatedUser } from "@/modules/auth/lib/session.js";
import { getClientIp } from "@/modules/security/ip/request-ip.js";
import type { SecureAuthServices } from "@/core/types.js";
import type { RouteContext } from "../../create-routes.js";
import {
  handleUserPreferencesError,
  readPreferencesNamespaceParam,
} from "./user-preferences-shared.js";

const putSchema = z.object({
  value: z.custom<unknown>((val) => val !== undefined, {
    message: "Invalid request",
  }),
});

async function readKeyParam(context: RouteContext | undefined): Promise<string | null> {
  if (!context) return null;
  const params = await context.params;
  const rawKey = params.key;
  if (!rawKey) return null;
  return Array.isArray(rawKey) ? rawKey[0] ?? null : rawKey;
}

async function preferencesByKeyGet(
  request: Request,
  context: RouteContext | undefined,
  services: SecureAuthServices
) {
  try {
    const user = await requireVerifiedFullyAuthenticatedUser(services);
    const key = await readKeyParam(context);
    if (!key) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const namespace = readPreferencesNamespaceParam(request, services.config.app.slug);
    const result = await services.userPreferencesService.get(
      user.id,
      key,
      namespace,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "GET /api/account/preferences/:key");
  }
}

async function preferencesByKeyPut(
  request: Request,
  context: RouteContext | undefined,
  services: SecureAuthServices
) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const key = await readKeyParam(context);
    if (!key) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const body = await parseJsonBody(request);
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const namespace = readPreferencesNamespaceParam(request, services.config.app.slug);
    const result = await services.userPreferencesService.set(
      user.id,
      key,
      parsed.data.value,
      namespace,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "PUT /api/account/preferences/:key");
  }
}

async function preferencesByKeyDelete(
  request: Request,
  context: RouteContext | undefined,
  services: SecureAuthServices
) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const key = await readKeyParam(context);
    if (!key) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const namespace = readPreferencesNamespaceParam(request, services.config.app.slug);
    const result = await services.userPreferencesService.remove(
      user.id,
      key,
      namespace,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "DELETE /api/account/preferences/:key");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) =>
    preferencesByKeyGet(request, context, services);
}

export function createPutHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) =>
    preferencesByKeyPut(request, context, services);
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) =>
    preferencesByKeyDelete(request, context, services);
}
