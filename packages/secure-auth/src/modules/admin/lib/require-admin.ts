import "server-only";
import { requireFullyAuthenticatedUser } from "@/modules/auth/lib/session";
import { requireSameOriginRequest } from "@/modules/security/policies/same-origin";
import type { SecureAuthServices } from "@/core/types";

export class AdminDisabledError extends Error {
  constructor() {
    super("Admin panel is not enabled");
    this.name = "AdminDisabledError";
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdminUser(services: SecureAuthServices) {
  if (!services.adminService.isEnabled()) {
    throw new AdminDisabledError();
  }

  const session = await requireFullyAuthenticatedUser(services);

  const user = await services.repos.adminUserRepository.findById(session.id);
  if (!user || user.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }

  return { session, user };
}

/** Same-origin check + fully authenticated admin for mutating admin API routes. */
export async function requireMutatingAdminUser(request: Request, services: SecureAuthServices) {
  requireSameOriginRequest(request, services.config);
  return requireAdminUser(services);
}
