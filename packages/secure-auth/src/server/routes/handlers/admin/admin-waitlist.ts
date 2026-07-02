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

async function adminWaitlistGet(_request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);
    const result = await services.adminService.listUsers({ status: "pending", limit: 100, offset: 0 });
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/waitlist");
  }
}

const approveSchema = z.object({ userId: z.string().uuid() });

async function adminWaitlistPost(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireMutatingAdminUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = approveSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "userId required" }, { status: 400 });
    const result = await services.adminService.approveUser(parsed.data.userId, session.id);
    if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminError(error, "POST /api/auth/admin/waitlist");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminWaitlistGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => adminWaitlistPost(request, services);
}
