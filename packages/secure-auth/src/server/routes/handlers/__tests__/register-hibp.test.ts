import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { getTestServices } from "@/test/helpers/mock-services";
import { BREACHED_PASSWORD_ERROR } from "@/modules/security/password-policy/hibp-checker";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  createUser: vi.fn(),
  sendVerificationEmailForUser: vi.fn(),
}));

vi.mock("@/modules/captcha/services/turnstile-verifier", () => ({
  verifyCaptcha: vi.fn(async () => undefined),
}));

let services: SecureAuthServices;
const fetchMock = vi.fn();

function sha1(password: string): string {
  return createHash("sha1").update(password).digest("hex").toUpperCase();
}

async function buildServices() {
  return getTestServices(
    {
      passwordPolicy: { enforcement: "enforce", minLength: 12, checkBreachedPasswords: true },
    },
    (base) => ({
      repos: {
        ...base.repos,
        userRepository: {
          ...base.repos.userRepository,
          findByEmail: mocks.findByEmail,
          create: mocks.createUser,
        },
      },
      accountAuthService: {
        ...base.accountAuthService,
        sendVerificationEmailForUser: mocks.sendVerificationEmailForUser,
      },
    })
  );
}

describe("register HIBP integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    mocks.findByEmail.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    });
    mocks.sendVerificationEmailForUser.mockResolvedValue(undefined);
    services = await buildServices();
  });

  it("registration with breached password returns 400 with breach error message", async () => {
    const password = "BreachedPassword123!";
    const hash = sha1(password);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => `${hash.slice(5)}:99`,
    });

    const { registerPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password }),
      }),
      services
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: BREACHED_PASSWORD_ERROR });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("registration with clean password returns 201", async () => {
    const password = "CleanUniquePassword123!";
    const hash = sha1(password);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "000000000000000000000000000000000:1",
    });

    const { registerPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password }),
      }),
      services
    );

    expect(res.status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalled();
  });

  it("HIBP fetch fails and registration proceeds", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const password = "CleanUniquePassword123!";

    const { registerPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", password }),
      }),
      services
    );

    expect(res.status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalled();
  });
});
