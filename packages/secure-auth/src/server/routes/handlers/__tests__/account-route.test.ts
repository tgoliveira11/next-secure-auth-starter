import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountDelete as DELETE, accountGet as GET } from "@/test/helpers/handlers";
import { USER_ID } from "@/test/helpers/fixtures";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";

vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return {
    ...actual,
    requireFullyAuthenticatedUser: vi.fn(async () => ({
      id: USER_ID,
      email: "user@test.local",
      accountSessionId: "sess-current",
    })),
  };
});

vi.mock("@/server/services/account-service", () => ({
  accountService: {
    getDeletionRequirements: vi.fn(async () => ({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    })),
    deleteAccount: vi.fn(async () => ({ success: true })),
  },
}));

describe("/api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deletion requirements", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmationPhrase).toBe(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
  });

  it("maps unexpected GET failures", async () => {
    const { accountService } = await import("@/server/services/account-service");
    vi.mocked(accountService.getDeletionRequirements).mockRejectedValueOnce(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("deletes the authenticated account with confirmation payload", async () => {
    const { accountService } = await import("@/server/services/account-service");
    const res = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({
          confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
          password: "secret",
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(accountService.deleteAccount).toHaveBeenCalledWith(
      USER_ID,
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        password: "secret",
      },
      { ip: "127.0.0.1", accountSessionId: "sess-current" }
    );
  });

  it("rejects invalid delete payloads", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: "secret" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects password values in the delete URL", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/account?password=secret", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE }),
      })
    );
    expect(res.status).toBe(400);
  });
});
