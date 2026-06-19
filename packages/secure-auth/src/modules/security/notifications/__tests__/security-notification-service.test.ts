import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSecurityNotificationService } from "../security-notification-service";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

const mocks = vi.hoisted(() => ({
  deliverAccountEmail: vi.fn(),
  findActiveByUserId: vi.fn(),
}));

function createService(configOverrides: Parameters<typeof buildTestSecureAuthConfig>[0] = {}) {
  const config = buildTestSecureAuthConfig(configOverrides);
  return createSecurityNotificationService({
    config,
    ctx: {
      deliverAccountEmail: mocks.deliverAccountEmail,
    } as never,
    repos: {
      accountSessionRepository: {
        findActiveByUserId: mocks.findActiveByUserId,
      },
    } as never,
  });
}

describe("security notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deliverAccountEmail.mockResolvedValue(undefined);
    mocks.findActiveByUserId.mockResolvedValue([]);
  });

  it("notifySecurityEvent password_changed sends email with correct subject", async () => {
    const service = createService();
    await service.notifySecurityEvent({
      type: "password_changed",
      userId: "user-1",
      userEmail: "user@example.com",
    });

    expect(mocks.deliverAccountEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: expect.stringContaining("password was changed"),
      })
    );
  });

  it("notifySecurityEvent two_factor_disabled sends email", async () => {
    const service = createService();
    await service.notifySecurityEvent({
      type: "two_factor_disabled",
      userId: "user-1",
      userEmail: "user@example.com",
    });

    expect(mocks.deliverAccountEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Two-factor authentication disabled"),
      })
    );
  });

  it("notifySecurityEvent new_login on known device sends no email", async () => {
    mocks.findActiveByUserId.mockResolvedValue([
      { userAgentHash: "known-hash" },
      { userAgentHash: "other-hash" },
    ]);

    const service = createService();
    await service.notifySecurityEvent({
      type: "new_login",
      userId: "user-1",
      userEmail: "user@example.com",
      userAgentHash: "known-hash",
    });

    expect(mocks.deliverAccountEmail).not.toHaveBeenCalled();
  });

  it("notifySecurityEvent new_login on new device sends email", async () => {
    mocks.findActiveByUserId.mockResolvedValue([{ userAgentHash: "known-hash" }]);

    const service = createService();
    await service.notifySecurityEvent({
      type: "new_login",
      userId: "user-1",
      userEmail: "user@example.com",
      userAgentHash: "new-hash",
      browser: "Chrome",
      platform: "macOS",
    });

    expect(mocks.deliverAccountEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("New sign-in"),
      })
    );
  });

  it("email provider throws and function resolves without throwing", async () => {
    mocks.deliverAccountEmail.mockRejectedValue(new Error("smtp down"));
    const service = createService();

    await expect(
      service.notifySecurityEvent({
        type: "password_changed",
        userId: "user-1",
        userEmail: "user@example.com",
      })
    ).resolves.toBeUndefined();
  });

  it("securityNotifications.enabled = false sends no email for any event", async () => {
    const service = createService({
      auth: {
        afterLoginPath: "/dashboard",
        afterLogoutPath: "/login",
        requireEmailVerificationBeforeSignIn: false,
        nextAuthSecret: "test-secret-for-vitest-only",
        twoFactorEncryptionKey: "test-two-factor-secret-encryption-key",
        securityNotifications: { enabled: false },
      },
    });

    await service.notifySecurityEvent({
      type: "password_changed",
      userId: "user-1",
      userEmail: "user@example.com",
    });

    expect(mocks.deliverAccountEmail).not.toHaveBeenCalled();
  });
});
