import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { getSessionUser, UnauthorizedError } from "@/modules/auth/lib/session";
import type { SecureAuthServices } from "@/core/types";

const updateSchema = z.object({
  displayName: z.string().max(128).optional(),
  avatarUrl: z.string().url().max(512).optional(),
  bio: z.string().max(500).optional(),
});

async function profileGet(request: Request, services: SecureAuthServices) {
  try {
    const session = await getSessionUser(services);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const profile = await services.profileService.getProfile(session.id);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return apiError(error, "GET /api/account/profile");
  }
}

async function profilePatch(request: Request, services: SecureAuthServices) {
  try {
    const session = await getSessionUser(services);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await parseJsonBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    await services.profileService.updateProfile(session.id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return apiError(error, "PATCH /api/account/profile");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => profileGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => profilePatch(request, services);
}
