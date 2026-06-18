import "server-only";
import { requireSameOriginRequest } from "@/modules/security/policies/same-origin";
import type { SecureAuthServices } from "@/core/types";
import {
  requireVerifiedFullyAuthenticatedUser,
  type VerifiedSessionUser,
} from "./session";

/** Same-origin check + verified fully authenticated user for mutating account/security routes. */
export async function requireVerifiedMutatingAccountUser(
  request: Request,
  services: SecureAuthServices
): Promise<VerifiedSessionUser> {
  requireSameOriginRequest(request, services.config);
  return requireVerifiedFullyAuthenticatedUser(services);
}
