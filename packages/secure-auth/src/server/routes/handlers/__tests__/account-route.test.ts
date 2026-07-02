import { describe, it, expect, vi, beforeEach } from "vitest";
import { accountDelete as DELETE, accountGet as GET } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/modules/account/lib/account-deletion";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  getDeletionRequirements: vi.fn(),
  deleteAccount: vi.fn(),
  requireVerifiedFullyAuthenticatedUser: vi.fn(),
  requireVerifiedMutatingAccountUser: vi.fn(),
}));

vi.mock("@/modules/auth/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/lib/session")>();
  return {
    ...actual,
    requireVerifiedFullyAuthenticatedUser: mocks.requireVerifiedFullyAuthenticatedUser,
  };
});

vi.mock("@/modules/auth/lib/route-auth", () => ({
  requireVerifiedMutatingAccountUser: mocks.requireVerifiedMutatingAccountUser,
}));

let services: SecureAuthServices;

async function buildServices() {
  return getTestServices({}, (base) => ({
    accountService: {
      ...base.accountService,
      getDeletionRequirements: mocks.getDeletionRequirements,
      deleteAccount: mocks.deleteAccount,
    },
  }));
}

function deleteRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      Origin: "http://localhost:3001",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

describe("/api/account", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@test.local",
      accountSessionId: "sess-current",
    });
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: USER_ID,
      email: "user@test.local",
      accountSessionId: "sess-current",
    });
    mocks.getDeletionRequirements.mockResolvedValue({
      requiresPassword: true,
      authProvider: "credentials",
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    });
    mocks.deleteAccount.mockResolvedValue({ success: true });
    services = await buildServices();
  });

  it("returns deletion requirements", async () => {
    const res = await GET(services);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.confirmationPhrase).toBe(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
  });

  it("maps unexpected GET failures", async () => {
    mocks.getDeletionRequirements.mockRejectedValueOnce(new Error("db down"));
    const res = await GET(services);
    expect(res.status).toBe(500);
  });

  it("deletes the authenticated account with confirmation payload", async () => {
    const res = await DELETE(
      deleteRequest("http://localhost:3001/api/account", {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        password: "secret",
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.deleteAccount).toHaveBeenCalledWith(
      USER_ID,
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        password: "secret",
      },
      { ip: "unknown-ip", accountSessionId: "sess-current" }
    );
  });

  it("rejects invalid delete payloads", async () => {
    const res = await DELETE(
      deleteRequest("http://localhost:3001/api/account", { password: "secret" }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("rejects password values in the delete URL", async () => {
    const res = await DELETE(
      new Request("http://localhost:3001/api/account?password=secret", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          Origin: "http://localhost:3001",
        },
        body: JSON.stringify({ confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });
});
