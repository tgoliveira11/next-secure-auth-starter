import "server-only";
import { getSessionUser, UnauthorizedError } from "@/modules/auth/lib/session";
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

  const session = await getSessionUser(services);
  if (!session) throw new UnauthorizedError("Authentication required");

  const user = await services.repos.adminUserRepository.findById(session.id);
  if (!user || user.role !== "admin") {
    throw new ForbiddenError("Admin access required");
  }

  return { session, user };
}
