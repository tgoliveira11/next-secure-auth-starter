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

async function adminInvitesGet(_request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);
    const codes = await services.inviteService.listCodes();
    return NextResponse.json({ codes });
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/invites");
  }
}

const createSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  emailHint: z.string().email().optional(),
});

async function adminInvitesPost(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireAdminUser(services);
    const body = await parseJsonBody(request);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const result = await services.inviteService.generateCode(session.id, { ...parsed.data, isAdmin: true });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleAdminError(error, "POST /api/auth/admin/invites");
  }
}

const revokeSchema = z.object({ codeId: z.string().uuid() });

async function adminInvitesDelete(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireAdminUser(services);
    const body = await parseJsonBody(request);
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "codeId required" }, { status: 400 });
    await services.inviteService.revokeCode(parsed.data.codeId, session.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminError(error, "DELETE /api/auth/admin/invites");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminInvitesGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => adminInvitesPost(request, services);
}

export function createDeleteHandler(services: SecureAuthServices) {
  return (request: Request) => adminInvitesDelete(request, services);
}
