import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  passkeysListGet as listGet,
  passkeyRegisterPost as registerPost,
  passkeyEnableSignInPost as enableSignInPost,
  passkeyDelete as deletePasskey,
} from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { USER_ID } from "@/test/helpers/fixtures";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requireVerifiedFullyAuthenticatedUser: vi.fn(),
  requireVerifiedMutatingAccountUser: vi.fn(),
  listPasskeys: vi.fn(),
  getRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  removePasskey: vi.fn(),
  getSignInCapabilityOptions: vi.fn(),
  verifySignInCapability: vi.fn(),
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

function sameOriginRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    ...init,
    headers: {
      Origin: "http://localhost:3001",
      ...(init?.headers ?? {}),
    },
  });
}

async function buildServices() {
  return getTestServices({}, (base) => ({
    passkeyAccountService: {
      ...base.passkeyAccountService,
      listPasskeys: mocks.listPasskeys,
      getRegistrationOptions: mocks.getRegistrationOptions,
      verifyRegistration: mocks.verifyRegistration,
      removePasskey: mocks.removePasskey,
      getSignInCapabilityOptions: mocks.getSignInCapabilityOptions,
      verifySignInCapability: mocks.verifySignInCapability,
    },
  }));
}

describe("account passkeys API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requireVerifiedFullyAuthenticatedUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    mocks.requireVerifiedMutatingAccountUser.mockResolvedValue({
      id: USER_ID,
      email: "user@example.com",
    });
    services = await buildServices();
  });

  it("lists account passkeys", async () => {
    mocks.listPasskeys.mockResolvedValue([
      {
        id: "pk-1",
        credentialId: "credential-1",
        friendlyName: "Passkey",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastUsedAt: null,
        signInEnabled: true,
        vaultUnlockEnabled: false,
        capabilities: { signIn: true, vaultUnlock: false },
        removableFromAccountSettings: true,
        label: "Passkey",
        description: "Sign in without a password using this passkey.",
        badge: "Sign-in",
      },
    ]);
    const res = await listGet(services);
    expect(res.status).toBe(200);
    expect(mocks.requireVerifiedFullyAuthenticatedUser).toHaveBeenCalled();
    const body = await res.json();
    expect(body.passkeys[0].removableFromAccountSettings).toBe(true);
  });

  it("requires verified auth for registration options", async () => {
    mocks.getRegistrationOptions.mockResolvedValue({ challenge: "abc" });
    const res = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(mocks.requireVerifiedMutatingAccountUser).toHaveBeenCalled();
  });

  it("verifies passkey registration and rejects invalid payloads", async () => {
    mocks.verifyRegistration.mockResolvedValue({ id: "pk-2" });
    const ok = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({ action: "verify", response: { id: "cred" }, friendlyName: "Laptop" }),
      }),
      services
    );
    expect(ok.status).toBe(200);

    const missingResponse = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({ action: "verify" }),
      }),
      services
    );
    expect(missingResponse.status).toBe(400);

    const invalid = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({ action: "unknown" }),
      }),
      services
    );
    expect(invalid.status).toBe(400);
  });

  it("maps registration service failures", async () => {
    mocks.verifyRegistration.mockRejectedValue(new Error("verification failed"));
    const res = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({ action: "verify", response: { id: "cred" } }),
      }),
      services
    );
    expect(res.status).toBe(500);
  });

  it("starts and verifies an exact passkey sign-in capability upgrade", async () => {
    mocks.getSignInCapabilityOptions.mockResolvedValue({ options: { challenge: "challenge" } });
    mocks.verifySignInCapability.mockResolvedValue({
      verified: true,
      credentialId: "credential-id",
      signInEnabled: true,
    });
    const context = { params: Promise.resolve({ id: "pk-vault" }) };

    const options = await enableSignInPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-vault/enable-sign-in", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      }),
      context,
      services
    );
    expect(options.status).toBe(200);
    expect(mocks.getSignInCapabilityOptions).toHaveBeenCalledWith(
      USER_ID,
      "pk-vault",
      expect.anything()
    );

    const verify = await enableSignInPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-vault/enable-sign-in", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          response: { id: "credential-id", clientExtensionResults: {} },
        }),
      }),
      context,
      services
    );
    expect(verify.status).toBe(200);
    expect(mocks.verifySignInCapability).toHaveBeenCalledWith(
      USER_ID,
      "pk-vault",
      { id: "credential-id", clientExtensionResults: {} },
      expect.anything()
    );
  });

  it("rejects PRF in capability proof before invoking the service", async () => {
    const res = await enableSignInPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-vault/enable-sign-in", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          response: {
            id: "credential-id",
            clientExtensionResults: { prf: { results: { first: "PRF-SECRET-SENTINEL" } } },
          },
        }),
      }),
      { params: Promise.resolve({ id: "pk-vault" }) },
      services
    );

    expect(res.status).toBe(400);
    expect(mocks.verifySignInCapability).not.toHaveBeenCalled();
  });

  it("rejects nested PRF-derived aliases in capability proof", async () => {
    const res = await enableSignInPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-vault/enable-sign-in", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          response: { id: "credential-id", metadata: { nested: { prfResults: null } } },
        }),
      }),
      { params: Promise.resolve({ id: "pk-vault" }) },
      services
    );

    expect(res.status).toBe(400);
    expect(mocks.verifySignInCapability).not.toHaveBeenCalled();
  });

  it("rejects capability upgrade requests without a credential route id", async () => {
    const res = await enableSignInPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/unknown/enable-sign-in", {
        method: "POST",
        body: JSON.stringify({ action: "options" }),
      }),
      undefined,
      services
    );

    expect(res.status).toBe(400);
    expect(mocks.getSignInCapabilityOptions).not.toHaveBeenCalled();
  });

  it.each([null, {}, { enabled: true }, { results: { first: "PRF-SECRET-SENTINEL" } }])(
    "rejects registration responses containing PRF extension results: %o",
    async (prf) => {
      const res = await registerPost(
        sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
          method: "POST",
          body: JSON.stringify({
            action: "verify",
            response: { id: "cred", clientExtensionResults: { prf } },
          }),
        }),
        services
      );

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid request" });
      expect(mocks.verifyRegistration).not.toHaveBeenCalled();
    }
  );

  it("rejects nested PRF-derived aliases before registration verification", async () => {
    const res = await registerPost(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/register", {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          response: { id: "cred", metadata: { nested: { prf_output: null } } },
        }),
      }),
      services
    );

    expect(res.status).toBe(400);
    expect(mocks.verifyRegistration).not.toHaveBeenCalled();
  });

  it("deletes a passkey by id", async () => {
    mocks.removePasskey.mockResolvedValue({ success: true });
    const res = await deletePasskey(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-1"),
      { params: Promise.resolve({ id: "pk-1" }) },
      services
    );
    expect(res.status).toBe(200);
  });

  it("maps passkey boundary errors to 409", async () => {
    const { PasskeyAccountBoundaryError } = await import("@/modules/passkeys/services/passkey-service");
    mocks.removePasskey.mockRejectedValue(
      new PasskeyAccountBoundaryError(
        "This passkey is not managed from account security settings."
      )
    );
    const res = await deletePasskey(
      sameOriginRequest("http://localhost:3001/api/account/passkeys/pk-vault"),
      { params: Promise.resolve({ id: "pk-vault" }) },
      services
    );
    expect(res.status).toBe(409);
  });
});
