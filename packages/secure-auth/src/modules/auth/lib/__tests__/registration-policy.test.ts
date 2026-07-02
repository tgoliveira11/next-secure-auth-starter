import { describe, it, expect } from "vitest";
import { oauthRegistrationBlocked, resolveInitialUserStatus } from "../registration-policy";
import type { InviteService } from "@/modules/admin/services/invite-service";

function mockInviteService(overrides: Partial<InviteService> = {}): InviteService {
  return {
    isEnabled: () => false,
    requiresApproval: () => false,
    requiresCode: () => false,
    validateCode: async () => {
      throw new Error("not implemented");
    },
    consumeCode: async () => undefined,
    generateCode: async () => {
      throw new Error("not implemented");
    },
    revokeCode: async () => undefined,
    listCodes: async () => [],
    ...overrides,
  };
}

describe("registration policy", () => {
  it("resolveInitialUserStatus returns pending when approval is required", () => {
    expect(
      resolveInitialUserStatus(mockInviteService({ requiresApproval: () => true }))
    ).toBe("pending");
  });

  it("resolveInitialUserStatus returns active by default", () => {
    expect(resolveInitialUserStatus(mockInviteService())).toBe("active");
  });

  it("oauthRegistrationBlocked is true when invite code is required", () => {
    expect(oauthRegistrationBlocked(mockInviteService({ requiresCode: () => true }))).toBe(true);
    expect(oauthRegistrationBlocked(mockInviteService())).toBe(false);
  });
});
