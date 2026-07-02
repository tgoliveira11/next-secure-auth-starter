import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTestServices } from "@/test/helpers/mock-services";
import {
  MAGIC_LINK_INVALID_MESSAGE,
  MAGIC_LINK_REQUEST_MESSAGE,
} from "@/modules/auth/services/magic-link-service";
import { RateLimitError } from "@/modules/rate-limit/index";
import type { SecureAuthServices } from "@/core/types";

const mocks = vi.hoisted(() => ({
  requestMagicLink: vi.fn(),
  verifyMagicLink: vi.fn(),
  completeMagicLinkSignIn: vi.fn(),
}));

let services: SecureAuthServices;

async function buildServices(configOverrides: Parameters<typeof getTestServices>[0] = {}) {
  return getTestServices(
    {
      auth: {
        afterLoginPath: "/dashboard",
        afterLogoutPath: "/login",
        requireEmailVerificationBeforeSignIn: false,
        nextAuthSecret: "test-secret-for-vitest-only",
        twoFactorEncryptionKey: "test-two-factor-secret-encryption-key",
        magicLink: { enabled: true },
      },
      ...configOverrides,
    },
    (base) => ({
      magicLinkService: {
        ...base.magicLinkService,
        requestMagicLink: mocks.requestMagicLink,
        verifyMagicLink: mocks.verifyMagicLink,
        completeMagicLinkSignIn: mocks.completeMagicLinkSignIn,
      },
    })
  );
}

describe("magic link API routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.requestMagicLink.mockResolvedValue(undefined);
    mocks.verifyMagicLink.mockResolvedValue({ userId: "user-1" });
    mocks.completeMagicLinkSignIn.mockResolvedValue({
      requiresTwoFactor: false,
      loginToken: "login-token",
      redirectTo: "/dashboard",
    });
    services = await buildServices();
  });

  it("POST /request with valid email returns generic message", async () => {
    const { magicLinkRequestPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: MAGIC_LINK_REQUEST_MESSAGE });
  });

  it("POST /request with unknown email returns same generic message", async () => {
    const { magicLinkRequestPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: MAGIC_LINK_REQUEST_MESSAGE });
  });

  it("POST /request rate limit exceeded returns 429", async () => {
    mocks.requestMagicLink.mockRejectedValue(new RateLimitError("Too many requests. Please try again later."));
    const { magicLinkRequestPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(429);
  });

  it("POST /verify with valid token and no 2FA returns redirectTo", async () => {
    const { magicLinkVerifyPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "valid-magic-link-token" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ redirectTo: "/dashboard" });
  });

  it("POST /verify with valid token and 2FA enabled returns requiresTwoFactor", async () => {
    mocks.completeMagicLinkSignIn.mockResolvedValue({
      requiresTwoFactor: true,
      challengeToken: "challenge-token",
    });
    const { magicLinkVerifyPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "valid-magic-link-token" }),
      }),
      services
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ requiresTwoFactor: true });
  });

  it("POST /verify with expired token returns 400", async () => {
    mocks.verifyMagicLink.mockResolvedValue(null);
    const { magicLinkVerifyPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "expired-magic-link-token" }),
      }),
      services
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: MAGIC_LINK_INVALID_MESSAGE });
  });

  it("POST /verify with consumed token returns 400", async () => {
    mocks.verifyMagicLink.mockResolvedValue(null);
    const { magicLinkVerifyPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ token: "consumed-magic-link-token" }),
      }),
      services
    );
    expect(res.status).toBe(400);
  });

  it("GET /verify is no longer exposed on the API route", async () => {
    const mod = await import("../auth/magic-link-verify.js");
    expect("createGetHandler" in mod).toBe(false);
  });

  it("POST /request when magicLink.enabled = false returns 404", async () => {
    services = await buildServices({
      auth: {
        afterLoginPath: "/dashboard",
        afterLogoutPath: "/login",
        requireEmailVerificationBeforeSignIn: false,
        nextAuthSecret: "test-secret-for-vitest-only",
        twoFactorEncryptionKey: "test-two-factor-secret-encryption-key",
        magicLink: { enabled: false },
      },
    });
    const { magicLinkRequestPost: POST } = await import("@/test/helpers/handlers");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      services
    );
    expect(res.status).toBe(404);
  });
});
