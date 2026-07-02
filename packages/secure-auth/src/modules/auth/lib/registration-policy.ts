import "server-only";
import type { InviteService } from "@/modules/admin/services/invite-service";

export type InitialUserStatus = "pending" | "active";

export function resolveInitialUserStatus(inviteService: InviteService): InitialUserStatus {
  if (inviteService.requiresApproval()) {
    return "pending";
  }
  return "active";
}

/** When invite codes are mandatory, OAuth self-registration must be blocked. */
export function oauthRegistrationBlocked(inviteService: InviteService): boolean {
  return inviteService.requiresCode();
}
