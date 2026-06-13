import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAccountSessionService } from "../account-session-service";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { createSecureAuthContext } from "@/core/create-secure-auth-context";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_A = "660e8400-e29b-41d4-a716-446655440001";
const SESSION_B = "660e8400-e29b-41d4-a716-446655440002";

function buildService(singleActiveSession: boolean) {
  const config = buildTestSecureAuthConfig({
    sessions: { singleActiveSession },
  });
  const ctx = createSecureAuthContext({ config });
  const revokeAllExcept = vi.fn().mockResolvedValue([{ id: SESSION_A }]);
  const record = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockResolvedValue({ id: SESSION_B, userId: USER_ID });

  const service = createAccountSessionService({
    config,
    ctx,
    repos: {
      accountSessionRepository: {
        create,
        revokeAllExcept,
        findActiveByUserId: vi.fn(),
        isActive: vi.fn(),
        revokeById: vi.fn(),
        touchLastUsed: vi.fn(),
        updateMetadata: vi.fn(),
        revokeAllForUser: vi.fn(),
        findByIdForUser: vi.fn(),
      },
      auditRepository: { record },
    } as never,
    rateLimit: { enforceRateLimit: vi.fn() } as never,
  });

  return { service, revokeAllExcept, record };
}

describe("accountSessionService.enforceSingleActiveSessionOnLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when singleActiveSession is disabled (default)", async () => {
    const { service, revokeAllExcept, record } = buildService(false);

    const result = await service.enforceSingleActiveSessionOnLogin({
      userId: USER_ID,
      currentSessionId: SESSION_B,
      authMethod: "password",
    });

    expect(result.revokedCount).toBe(0);
    expect(revokeAllExcept).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("revokes other sessions when singleActiveSession is enabled", async () => {
    const { service, revokeAllExcept, record } = buildService(true);

    const result = await service.enforceSingleActiveSessionOnLogin({
      userId: USER_ID,
      currentSessionId: SESSION_B,
      authMethod: "password",
    });

    expect(revokeAllExcept).toHaveBeenCalledWith(USER_ID, SESSION_B);
    expect(result.revokedCount).toBe(1);
    expect(record).toHaveBeenCalledWith("sessions_revoked_on_login", USER_ID, {
      endpoint: "/api/auth/callback",
      authProvider: "password",
      sessionCountRevoked: 1,
    });
  });

  it("preserves the current session id when revoking others", async () => {
    const { service, revokeAllExcept } = buildService(true);

    await service.enforceSingleActiveSessionOnLogin({
      userId: USER_ID,
      currentSessionId: SESSION_B,
      authMethod: "google",
    });

    expect(revokeAllExcept).toHaveBeenCalledWith(USER_ID, SESSION_B);
  });

  it("does not write audit event when no other sessions exist", async () => {
    const config = buildTestSecureAuthConfig({ sessions: { singleActiveSession: true } });
    const ctx = createSecureAuthContext({ config });
    const revokeAllExcept = vi.fn().mockResolvedValue([]);
    const record = vi.fn().mockResolvedValue(undefined);

    const service = createAccountSessionService({
      config,
      ctx,
      repos: {
        accountSessionRepository: { revokeAllExcept },
        auditRepository: { record },
      } as never,
      rateLimit: { enforceRateLimit: vi.fn() } as never,
    });

    const result = await service.enforceSingleActiveSessionOnLogin({
      userId: USER_ID,
      currentSessionId: SESSION_B,
      authMethod: "passkey",
    });

    expect(result.revokedCount).toBe(0);
    expect(record).not.toHaveBeenCalled();
  });
});

describe("isSingleActiveSessionEnabled", () => {
  it("defaults to false when omitted", async () => {
    const { isSingleActiveSessionEnabled } = await import(
      "@/modules/sessions/lib/session-config"
    );
    expect(isSingleActiveSessionEnabled(buildTestSecureAuthConfig())).toBe(false);
  });

  it("returns true only when explicitly enabled", async () => {
    const { isSingleActiveSessionEnabled } = await import(
      "@/modules/sessions/lib/session-config"
    );
    expect(
      isSingleActiveSessionEnabled(
        buildTestSecureAuthConfig({ sessions: { singleActiveSession: true } })
      )
    ).toBe(true);
  });
});
