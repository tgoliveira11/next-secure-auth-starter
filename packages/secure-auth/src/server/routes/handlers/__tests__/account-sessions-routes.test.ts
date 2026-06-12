import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import type { SecureAuthServices } from "@/core/types";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";

const mocks = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
  revokeAllSessions: vi.fn(),
  revokeCurrentSession: vi.fn(),
  enrichFromRequest: vi.fn(),
  requireFullyAuthenticatedUser: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", () => ({
  requireFullyAuthenticatedUser: mocks.requireFullyAuthenticatedUser,
  UnauthorizedError: class UnauthorizedError extends Error {
    name = "UnauthorizedError";
  },
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    accountSessionService: {
      ...base.accountSessionService,
      listSessions: mocks.listSessions,
      revokeSession: mocks.revokeSession,
      revokeOtherSessions: mocks.revokeOtherSessions,
      revokeAllSessions: mocks.revokeAllSessions,
      revokeCurrentSession: mocks.revokeCurrentSession,
      enrichFromRequest: mocks.enrichFromRequest,
    },
  }));
}

describe("account sessions API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: SESSION_ID,
    });
    services = await buildServices();
  });

  it("GET /api/account/sessions requires authentication", async () => {
    const { UnauthorizedError } = await import("@/modules/auth/lib/session");
    mocks.requireFullyAuthenticatedUser.mockRejectedValue(
      new UnauthorizedError("Authentication required")
    );
    const { sessionsListGet: GET } = await import("@/test/helpers/handlers");
    const res = await GET(services);
    expect(res.status).toBe(401);
  });

  it("GET /api/account/sessions returns session list without raw tokens", async () => {
    mocks.listSessions.mockResolvedValue({
      sessions: [
        {
          id: SESSION_ID,
          isCurrent: true,
          authMethod: "password",
          browser: "Chrome",
          platform: "macOS",
          deviceType: "desktop",
          ipMasked: "187.45.12.xxx",
          createdAt: "2026-01-01T10:00:00.000Z",
          lastUsedAt: "2026-01-02T12:00:00.000Z",
          expiresAt: "2026-02-01T10:00:00.000Z",
        },
      ],
    });
    const { sessionsListGet: GET } = await import("@/test/helpers/handlers");
    const res = await GET(services);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sessions[0].id).toBe(SESSION_ID);
    expect(JSON.stringify(body)).not.toMatch(/sessionToken|tokenHash/i);
  });

  it("DELETE /api/account/sessions/:id returns 404 when missing", async () => {
    mocks.revokeSession.mockRejectedValue(
      Object.assign(new Error("Session not found"), { name: "NotFoundError" })
    );
    const { sessionDelete: DELETE } = await import("@/test/helpers/handlers");
    const res = await DELETE(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: "missing" }) },
      services
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /api/account/sessions/:id revokes session", async () => {
    mocks.revokeSession.mockResolvedValue({ revoked: true, signOut: false });
    const { sessionDelete: DELETE } = await import("@/test/helpers/handlers");
    const res = await DELETE(
      new Request("http://localhost"),
      { params: Promise.resolve({ id: "other-session" }) },
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      USER_ID,
      "other-session",
      SESSION_ID,
      expect.any(String)
    );
  });

  it("POST /api/account/sessions/revoke-others keeps current session", async () => {
    mocks.revokeOtherSessions.mockResolvedValue({ revokedCount: 2 });
    const { sessionsRevokeOthersPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST" }), services);
    expect(res.status).toBe(200);
    expect(mocks.revokeOtherSessions).toHaveBeenCalledWith(USER_ID, SESSION_ID, expect.any(String));
  });

  it("POST /api/account/sessions/revoke-all signs out everywhere", async () => {
    mocks.revokeAllSessions.mockResolvedValue({ revokedCount: 3, signOut: true });
    const { sessionsRevokeAllPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST" }), services);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revokedCount: 3, signOut: true });
  });

  it("POST /api/account/sessions/revoke-others requires current session id", async () => {
    const { UnauthorizedError } = await import("@/modules/auth/lib/session");
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: undefined,
    });
    const { sessionsRevokeOthersPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST" }), services);
    expect(res.status).toBe(401);
    expect(mocks.revokeOtherSessions).not.toHaveBeenCalled();
    void UnauthorizedError;
  });

  it("POST /api/account/sessions/revoke-current revokes the active session", async () => {
    mocks.revokeCurrentSession.mockResolvedValue({ revoked: true });
    const { sessionsRevokeCurrentPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(services);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revoked: true });
    expect(mocks.revokeCurrentSession).toHaveBeenCalledWith(USER_ID, SESSION_ID);
  });

  it("POST /api/account/sessions/ping enriches current session", async () => {
    mocks.enrichFromRequest.mockResolvedValue(undefined);
    const { sessionsPingPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "user-agent": "Mozilla/5.0 Chrome" },
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.enrichFromRequest).toHaveBeenCalled();
  });

  it("POST /api/account/sessions/ping skips enrich without session id", async () => {
    mocks.requireFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
      accountSessionId: undefined,
    });
    const { sessionsPingPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(new Request("http://localhost", { method: "POST" }), services);
    expect(res.status).toBe(200);
    expect(mocks.enrichFromRequest).not.toHaveBeenCalled();
  });
});
