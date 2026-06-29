import type { NextRequest } from "next/server";
import type { SecureAuthServices } from "../core/types.js";
import type { ApiKeyPrincipal } from "../modules/admin/services/api-key-service.js";

export type { ApiKeyPrincipal };

export function withApiKeyAuth(
  services: SecureAuthServices,
  handler: (request: NextRequest, principal: ApiKeyPrincipal) => Response | Promise<Response>,
  options?: { scopes?: string[] }
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawKey = authHeader.slice(7);
    const principal = await services.apiKeyService.validateKey(rawKey);

    if (!principal) {
      return Response.json({ error: "Invalid or expired API key" }, { status: 401 });
    }

    if (options?.scopes && options.scopes.length > 0) {
      const missing = options.scopes.filter((s) => !principal.scopes.includes(s));
      if (missing.length > 0) {
        return Response.json(
          { error: "Insufficient scopes", required: options.scopes, provided: principal.scopes },
          { status: 403 }
        );
      }
    }

    return handler(request, principal);
  };
}
