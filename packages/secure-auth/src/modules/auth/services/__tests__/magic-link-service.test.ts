import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMagicLinkService, MAGIC_LINK_TTL_MS } from "../magic-link-service";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import { hashOpaqueToken } from "@/modules/security/policies/login-token";

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  revokeActiveTokensForUser: vi.fn(),
  createToken: vi.fn(),
  consumeValidToken: vi.fn(),
  deliverAccountEmail: vi.fn(),
  enforceRateLimit: vi.fn(),
  isEnabledForUser: vi.fn(),
  issueLoginToken: vi.fn(),
  recordLoginSuccess: vi.fn(),
  createLoginChallenge: vi.fn(),
}));

function createService() {
  const config = buildTestSecureAuthConfig();
  const tokenStore = new Map<string, { userId: string; consumedAt: Date | null; expiresAt: Date }>();
  let tokenCounter = 0;

  mocks.createToken.mockImplementation(async (data: { userId: string; tokenHash: string; expiresAt: Date }) => {
    tokenStore.set(data.tokenHash, {
      userId: data.userId,
      consumedAt: null,
      expiresAt: data.expiresAt,
    });
    return { id: "token-1" };
  });

  mocks.consumeValidToken.mockImplementation(async (tokenHash: string) => {
    const row = tokenStore.get(tokenHash);
    if (!row || row.consumedAt || row.expiresAt <= new Date()) {
      return null;
    }
    row.consumedAt = new Date();
    return { userId: row.userId };
  });

  mocks.revokeActiveTokensForUser.mockImplementation(async (userId: string) => {
    for (const [, row] of tokenStore.entries()) {
      if (row.userId === userId && !row.consumedAt && row.expiresAt > new Date()) {
        row.consumedAt = new Date();
      }
    }
  });

  return {
    service: createMagicLinkService({
      config,
      ctx: {
        createOpaqueToken: () => `raw-magic-link-token-${++tokenCounter}-1234567890`,
        hashOpaqueToken: (token: string) => hashOpaqueToken(config, token),
        hashEmailForScope: (email: string) => `scope:${email}`,
        deliverAccountEmail: mocks.deliverAccountEmail,
      } as never,
      repos: {
        userRepository: {
          findByEmail: mocks.findByEmail,
          findById: mocks.findById,
        },
        accountTokenRepository: {
          revokeActiveTokensForUser: mocks.revokeActiveTokensForUser,
          create: mocks.createToken,
          consumeValidToken: mocks.consumeValidToken,
        },
        twoFactorRepository: {
          createLoginChallenge: mocks.createLoginChallenge,
        },
      } as never,
      rateLimit: { enforceRateLimit: mocks.enforceRateLimit } as never,
      authLoginService: { issueLoginToken: mocks.issueLoginToken } as never,
      authService: { recordLoginSuccess: mocks.recordLoginSuccess } as never,
      twoFactorService: { isEnabledForUser: mocks.isEnabledForUser } as never,
    }),
    config,
    tokenStore,
  };
}

describe("magic link service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findById.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      emailVerifiedAt: new Date(),
      status: "active",
    });
    mocks.isEnabledForUser.mockResolvedValue(false);
    mocks.issueLoginToken.mockResolvedValue("login-token");
    mocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it("requestMagicLink with unknown email returns void without sending email", async () => {
    const { service } = createService();
    await expect(service.requestMagicLink("missing@example.com")).resolves.toBeUndefined();
    expect(mocks.deliverAccountEmail).not.toHaveBeenCalled();
    expect(mocks.createToken).not.toHaveBeenCalled();
  });

  it("requestMagicLink with known email inserts token and sends email", async () => {
    mocks.findByEmail.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    const { service, config } = createService();

    await service.requestMagicLink("user@example.com");

    expect(mocks.revokeActiveTokensForUser).toHaveBeenCalledWith("user-1", "magic_link");
    expect(mocks.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "magic_link",
        expiresAt: expect.any(Date),
      })
    );
    expect(mocks.deliverAccountEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: expect.stringContaining(config.app.name),
      })
    );
  });

  it("requestMagicLink twice invalidates the first active token", async () => {
    mocks.findByEmail.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    const { service, config, tokenStore } = createService();

    await service.requestMagicLink("user@example.com");
    const firstHash = hashOpaqueToken(config, "raw-magic-link-token-1-1234567890");
    expect(tokenStore.get(firstHash)?.consumedAt).toBeNull();

    await service.requestMagicLink("user@example.com");
    expect(tokenStore.get(firstHash)?.consumedAt).not.toBeNull();
    expect(mocks.revokeActiveTokensForUser).toHaveBeenCalledTimes(2);
  });

  it("verifyMagicLink with valid token returns userId and marks token consumed", async () => {
    const { service, config, tokenStore } = createService();
    const rawToken = "raw-magic-link-token-1-1234567890";
    const tokenHash = hashOpaqueToken(config, rawToken);
    tokenStore.set(tokenHash, {
      userId: "user-1",
      consumedAt: null,
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });

    await expect(service.verifyMagicLink(rawToken)).resolves.toEqual({ userId: "user-1" });
    expect(tokenStore.get(tokenHash)?.consumedAt).not.toBeNull();
  });

  it("verifyMagicLink with already-consumed token returns null", async () => {
    const { service, config, tokenStore } = createService();
    const rawToken = "raw-magic-link-token-1-1234567890";
    const tokenHash = hashOpaqueToken(config, rawToken);
    tokenStore.set(tokenHash, {
      userId: "user-1",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });

    await expect(service.verifyMagicLink(rawToken)).resolves.toBeNull();
  });

  it("verifyMagicLink with expired token returns null", async () => {
    const { service, config, tokenStore } = createService();
    const rawToken = "raw-magic-link-token-1-1234567890";
    const tokenHash = hashOpaqueToken(config, rawToken);
    tokenStore.set(tokenHash, {
      userId: "user-1",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.verifyMagicLink(rawToken)).resolves.toBeNull();
  });

  it("verifyMagicLink with unknown token returns null", async () => {
    const { service } = createService();
    await expect(service.verifyMagicLink("unknown-token-value-123456")).resolves.toBeNull();
  });
});
