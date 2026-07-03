import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-helpers.js";
import { requireVerifiedMutatingAccountUser } from "@/modules/auth/lib/route-auth.js";
import { getClientIp } from "@/modules/security/ip/request-ip.js";
import type { SecureAuthServices } from "@/core/types.js";
import {
  handleUserPreferencesError,
  readPreferencesNamespaceParam,
} from "./user-preferences-shared.js";

const patchSchema = z.object({
  entries: z.record(z.string(), z.unknown()),
});

async function preferencesListPatch(request: Request, services: SecureAuthServices) {
  try {
    const user = await requireVerifiedMutatingAccountUser(request, services);
    const body = await parseJsonBody(request);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const namespace = readPreferencesNamespaceParam(request, services.config.app.slug);
    const result = await services.userPreferencesService.patch(
      user.id,
      parsed.data.entries,
      namespace,
      getClientIp(request, services.config)
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleUserPreferencesError(error, "PATCH /api/account/preferences");
  }
}

export function createPatchHandler(services: SecureAuthServices) {
  return (request: Request) => preferencesListPatch(request, services);
}
