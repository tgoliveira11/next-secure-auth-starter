import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { passkeysListGet, passkeyRegisterPost, passkeyLoginOptionsPost } from "@/test/helpers/handlers";
import { getTestServices } from "@/test/helpers/mock-services";
import { createTestSecureAuth } from "@/test/helpers/create-test-secure-auth";
import { USER_ID } from "@/test/helpers/fixtures";
import { NotFoundError } from "@/modules/passkeys/services/passkey-service";
import { ValidationError } from "@/modules/account/lib/account-errors";
import { GENERIC_PASSKEY_LOGIN_OPTIONS_ERROR } from "@/modules/auth/lib/public-auth-messages";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const getServerSessionMock = vi.mocked(getServerSession);

function sameOriginInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      Origin: "http://localhost:3001",
      ...(init?.headers ?? {}),
    },
  };
}

describe("API security hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects passkey list for pending 2FA sessions", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: USER_ID, email: "user@example.com" },
      twoFactorVerified: false,
      twoFactorPending: true,
      emailVerificationRequired: false,
    } as never);

    const services = await createTestSecureAuth().getServices();
    const res = await passkeysListGet(services);
    expect(res.status).toBe(401);
  });

  it("rejects passkey registration for pending 2FA sessions", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: USER_ID, email: "user@example.com" },
      twoFactorVerified: false,
      twoFactorPending: true,
      emailVerificationRequired: false,
    } as never);

    const services = await createTestSecureAuth().getServices();
    const res = await passkeyRegisterPost(
      new Request(
        "http://localhost:3001/api/account/passkeys/register",
        sameOriginInit({
          method: "POST",
          body: JSON.stringify({ action: "options" }),
        })
      ),
      services
    );
    expect(res.status).toBe(401);
  });

  it("returns generic passkey login options errors", async () => {
    const getLoginOptions = vi.fn().mockRejectedValue(new NotFoundError("No account found for this email."));
    const services = await getTestServices({}, (base) => ({
      passkeyLoginService: {
        ...base.passkeyLoginService,
        getLoginOptions,
      },
    }));

    const res = await passkeyLoginOptionsPost(
      new Request("http://localhost:3001/api/auth/passkey/login/options", {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" }),
      }),
      services
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe(GENERIC_PASSKEY_LOGIN_OPTIONS_ERROR);
    expect(body.error).not.toMatch(/account found/i);
  });

  it("maps passkey validation failures to generic public errors", async () => {
    const getLoginOptions = vi
      .fn()
      .mockRejectedValue(new ValidationError("This account does not have a passkey yet."));
    const services = await getTestServices({}, (base) => ({
      passkeyLoginService: {
        ...base.passkeyLoginService,
        getLoginOptions,
      },
    }));

    const res = await passkeyLoginOptionsPost(
      new Request("http://localhost:3001/api/auth/passkey/login/options", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    const body = await res.json();
    expect(body.error).toBe(GENERIC_PASSKEY_LOGIN_OPTIONS_ERROR);
  });
});
