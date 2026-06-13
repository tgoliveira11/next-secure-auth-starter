import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthOptions } from "../auth-options";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";

function buildAuthOptions(singleActiveSession: boolean) {
  const config = buildTestSecureAuthConfig({
    sessions: { singleActiveSession },
  });

  const createSession = vi.fn().mockResolvedValue({ id: SESSION_ID, userId: USER_ID });
  const enforceSingleActiveSessionOnLogin = vi.fn().mockResolvedValue({ revokedCount: 1 });
  const assertSessionActive = vi.fn().mockResolvedValue(true);
  const touchSessionThrottled = vi.fn().mockResolvedValue(undefined);
  const consumeSessionUpgradeToken = vi.fn().mockResolvedValue(true);

  const accountSessionService = {
    createSession,
    enforceSingleActiveSessionOnLogin,
    assertSessionActive,
    touchSessionThrottled,
    mapProviderToAuthMethod: vi.fn((provider?: string | null, loginAuthMethod?: string | null) => {
      if (provider === "login-token") return loginAuthMethod ?? "password";
      if (provider === "google") return "google";
      return "unknown";
    }),
  };

  const options = createAuthOptions({
    config,
    repos: {
      userRepository: {
        findByEmail: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: "user@example.com",
          passwordUpdatedAt: null,
        }),
        findById: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: "user@example.com",
          passwordUpdatedAt: null,
        }),
      },
    } as never,
    authService: { recordLoginSuccess: vi.fn() } as never,
    authLoginService: {} as never,
    twoFactorService: {
      isEnabledForUser: vi.fn().mockResolvedValue(false),
      consumeSessionUpgradeToken,
    } as never,
    accountSessionService: accountSessionService as never,
  });

  const jwt = options.callbacks?.jwt;
  if (!jwt) {
    throw new Error("jwt callback missing");
  }

  return {
    jwt,
    createSession,
    enforceSingleActiveSessionOnLogin,
    consumeSessionUpgradeToken,
  };
}

describe("createAuthOptions single active session policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not enforce on login when singleActiveSession is disabled", async () => {
    const { jwt, enforceSingleActiveSessionOnLogin } = buildAuthOptions(false);

    await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com", authMethod: "password" },
      account: { provider: "login-token", type: "credentials", providerAccountId: USER_ID },
      trigger: "signIn",
    } as never);

    expect(enforceSingleActiveSessionOnLogin).not.toHaveBeenCalled();
  });

  it("enforces after successful password login via login-token", async () => {
    const { jwt, enforceSingleActiveSessionOnLogin } = buildAuthOptions(true);

    await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com", authMethod: "password" },
      account: { provider: "login-token", type: "credentials", providerAccountId: USER_ID },
      trigger: "signIn",
    } as never);

    expect(enforceSingleActiveSessionOnLogin).toHaveBeenCalledWith({
      userId: USER_ID,
      currentSessionId: SESSION_ID,
      authMethod: "password",
    });
  });

  it("enforces after successful passkey login via login-token", async () => {
    const { jwt, enforceSingleActiveSessionOnLogin } = buildAuthOptions(true);

    await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com", authMethod: "passkey" },
      account: { provider: "login-token", type: "credentials", providerAccountId: USER_ID },
      trigger: "signIn",
    } as never);

    expect(enforceSingleActiveSessionOnLogin).toHaveBeenCalledWith({
      userId: USER_ID,
      currentSessionId: SESSION_ID,
      authMethod: "passkey",
    });
  });

  it("enforces after successful OAuth login when 2FA is not required", async () => {
    const { jwt, enforceSingleActiveSessionOnLogin } = buildAuthOptions(true);

    await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com" },
      account: { provider: "google", type: "oauth", providerAccountId: "google-sub" },
      trigger: "signIn",
    } as never);

    expect(enforceSingleActiveSessionOnLogin).toHaveBeenCalledWith({
      userId: USER_ID,
      currentSessionId: SESSION_ID,
      authMethod: "google",
    });
  });

  it("defers enforcement until 2FA completes for OAuth sign-in", async () => {
    const config = buildTestSecureAuthConfig({ sessions: { singleActiveSession: true } });
    const enforceSingleActiveSessionOnLogin = vi.fn().mockResolvedValue({ revokedCount: 1 });
    const createSession = vi.fn().mockResolvedValue({ id: SESSION_ID, userId: USER_ID });

    const options = createAuthOptions({
      config,
      repos: {
        userRepository: {
          findByEmail: vi.fn().mockResolvedValue({
            id: USER_ID,
            email: "user@example.com",
            passwordUpdatedAt: null,
          }),
          findById: vi.fn().mockResolvedValue({
            id: USER_ID,
            email: "user@example.com",
            passwordUpdatedAt: null,
          }),
        },
      } as never,
      authService: { recordLoginSuccess: vi.fn() } as never,
      authLoginService: {} as never,
      twoFactorService: {
        isEnabledForUser: vi.fn().mockResolvedValue(true),
        consumeSessionUpgradeToken: vi.fn().mockResolvedValue(true),
      } as never,
      accountSessionService: {
        createSession,
        enforceSingleActiveSessionOnLogin,
        assertSessionActive: vi.fn().mockResolvedValue(true),
        touchSessionThrottled: vi.fn(),
        mapProviderToAuthMethod: vi.fn(() => "google"),
      } as never,
    });

    const jwt = options.callbacks!.jwt!;

    const tokenAfterOAuth = await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com" },
      account: { provider: "google", type: "oauth", providerAccountId: "google-sub" },
      trigger: "signIn",
    } as never);

    expect(enforceSingleActiveSessionOnLogin).not.toHaveBeenCalled();
    expect(tokenAfterOAuth.twoFactorPending).toBe(true);

    await jwt({
      token: tokenAfterOAuth,
      user: undefined,
      account: undefined,
      trigger: "update",
      session: { twoFactorUpgradeToken: "upgrade-token" },
    } as never);

    expect(enforceSingleActiveSessionOnLogin).toHaveBeenCalledWith({
      userId: USER_ID,
      currentSessionId: SESSION_ID,
      authMethod: "google",
    });
  });
});
