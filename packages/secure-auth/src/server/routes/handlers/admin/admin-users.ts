import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJsonBody } from "@/lib/api-helpers";
import { requireAdminUser, requireMutatingAdminUser, AdminDisabledError, ForbiddenError } from "@/modules/admin/lib/require-admin";
import type { SecureAuthServices } from "@/core/types";
import type { RouteContext } from "../../create-routes.js";

const patchSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
});

function handleAdminError(error: unknown, endpoint: string) {
  if (error instanceof AdminDisabledError) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return apiError(error, endpoint);
}

async function adminUsersGet(request: Request, services: SecureAuthServices) {
  try {
    await requireAdminUser(services);

    const url = new URL(request.url);
    const role = url.searchParams.get("role") as "user" | "admin" | undefined ?? undefined;
    const status = url.searchParams.get("status") as "pending" | "active" | "suspended" | undefined ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const result = await services.adminService.listUsers({ role, status, search, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    return handleAdminError(error, "GET /api/auth/admin/users");
  }
}

async function adminUsersPatch(request: Request, services: SecureAuthServices, context?: RouteContext) {
  try {
    const { session } = await requireMutatingAdminUser(request, services);

    const params = context?.params ? await context.params : {};
    const targetId = params["id"] as string | undefined;
    if (!targetId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const body = await parseJsonBody(request);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { role, status } = parsed.data;
    let result;

    if (role !== undefined) {
      result = await services.adminService.setUserRole(targetId, role, session.id);
      if (result && "error" in result) {
        return NextResponse.json({ error: result.error }, { status: 422 });
      }
    }

    if (status !== undefined) {
      if (status === "active" || status === "suspended") {
        result = await services.adminService.setUserStatus(targetId, status, session.id);
        if (result && "error" in result) {
          return NextResponse.json({ error: result.error }, { status: 422 });
        }
      } else if (status === "pending") {
        return NextResponse.json({ error: "Cannot manually set status to pending" }, { status: 422 });
      }
    }

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleAdminError(error, "PATCH /api/auth/admin/users/:id");
  }
}

export function createGetHandler(services: SecureAuthServices) {
  return (request: Request) => adminUsersGet(request, services);
}

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request, context?: RouteContext) => adminUsersPatch(request, services, context);
}
