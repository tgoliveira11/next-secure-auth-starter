import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { requireAdminUser, AdminDisabledError, ForbiddenError } from "@/modules/admin/lib/require-admin";
import type { SecureAuthServices } from "@/core/types";

function handleAdminError(error: unknown, endpoint: string) {
  if (error instanceof AdminDisabledError) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (error instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return apiError(error, endpoint);
}

async function adminApiKeysGet(_request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);
    const keys = await services.apiKeyService.listKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/api-keys");
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(128),
  scopes: z.array(z.string()).optional(),
  expiryDays: z.number().int().min(0).nullable().optional(),
});

async function adminApiKeysPost(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireAdminUser(services);
    const body = await parseJsonBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { rawKey, apiKey } = await services.apiKeyService.createKey({
      ...parsed.data,
      createdBy: session.id,
    });
    const { keyHash: _, ...safeKey } = apiKey as typeof apiKey & { keyHash: string };
    return NextResponse.json({ rawKey, key: safeKey }, { status: 201 });
  } catch (error) {
    return handleAdminError(error, "POST /api/auth/admin/api-keys");
  }
}

const revokeSchema = z.object({ keyId: z.string().uuid() });

async function adminApiKeysDelete(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireAdminUser(services);
    const body = await parseJsonBody(request);
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "keyId required" }, { status: 400 });
    await services.apiKeyService.revokeKey(parsed.data.keyId, session.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminError(error, "DELETE /api/auth/admin/api-keys");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminApiKeysGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => adminApiKeysPost(request, services);
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request) => adminApiKeysDelete(request, services);
}
