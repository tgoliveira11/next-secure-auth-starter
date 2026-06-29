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

async function adminLocksGet(_request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);
    const [locked, frozen] = await Promise.all([
      services.lockoutService.listLockedAccounts(),
      services.lockoutService.listFrozenAccounts(),
    ]);
    return NextResponse.json({ locked, frozen });
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/locks");
  }
}

const unlockSchema = z.object({ userId: z.string().uuid() });

async function adminLocksPost(request: Request, services: SecureAuthServices) {
  try {
    const { session } = await requireAdminUser(services);
    const body = await parseJsonBody(request);
    const parsed = unlockSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "userId required" }, { status: 400 });
    await services.lockoutService.unlockByUserId(parsed.data.userId, session.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAdminError(error, "POST /api/auth/admin/locks");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminLocksGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => adminLocksPost(request, services);
}
