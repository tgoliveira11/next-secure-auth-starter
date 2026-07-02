import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { requireAdminUser, requireMutatingAdminUser, AdminDisabledError, ForbiddenError } from "@/modules/admin/lib/require-admin";
import type { SecureAuthServices } from "@/core/types";

function handleAdminError(error: unknown, endpoint: string) {
  if (error instanceof AdminDisabledError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return apiError(error, endpoint);
}

async function adminConfigGet(_request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);
    const keys = await services.configOverrideService.listAllKeys(services.config);
    return NextResponse.json({ keys });
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/config");
  }
}

const setSchema = z.object({ key: z.string(), value: z.unknown() });

async function adminConfigPost(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireMutatingAdminUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = setSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "key and value required" }, { status: 400 });
    await services.configOverrideService.setOverride(parsed.data.key, parsed.data.value, session.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not overridable")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return handleAdminError(error, "POST /api/auth/admin/config");
  }
}

const deleteSchema = z.object({ key: z.string() });

async function adminConfigDelete(request: Request, services: SecureAuthServices) {
  try {
    await requireMutatingAdminUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "key required" }, { status: 400 });
    await services.configOverrideService.deleteOverride(parsed.data.key);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminError(error, "DELETE /api/auth/admin/config");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminConfigGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => adminConfigPost(request, services);
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request) => adminConfigDelete(request, services);
}
