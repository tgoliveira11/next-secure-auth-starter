import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthOptions } from "../auth-options";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";
const VALID_MS_CLIENT_ID = "11111111-2222-3333-4444-555555555555";

function buildDeps(overrides: {
  config?: ReturnType<typeof buildTestSecureAuthConfig>;
  repos?: Record<string, unknown>;
  authService?: Record<string, unknown>;
  authLoginService?: Record<string, unknown>;
  twoFactorService?: Record<string, unknown>;
  accountSessionService?: Record<string, unknown>;
  profileService?: Record<string, unknown>;
} = {}) {
  const config = overrides.config ?? buildTestSecureAuthConfig();
  const createSession = vi.fn().mockResolvedValue({ id: SESSION_ID, userId: USER_ID });
  const accountSessionService = {
    createSession,
    enforceSingleActiveSessionOnLogin: vi.fn().mockResolvedValue({ revokedCount: 0 }),
    assertSessionActive: vi.fn().mockResolvedValue(true),
    touchSessionThrottled: vi.fn().mockResolvedValue(undefined),
    revokeOnSignOut: vi.fn().mockResolvedValue(undefined),
    mapProviderToAuthMethod: vi.fn((provider?: string | null) => {
      if (provider === "google") return "google";
      if (provider === "login-token") return "password";
      return "unknown";
    }),
    ...overrides.accountSessionService,
  };

  const options = createAuthOptions({
    config,
    repos: {
      userRepository: {
        findByEmail: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: "user@example.com",
          passwordUpdatedAt: null,
          emailVerifiedAt: new Date(),
          authProvider: "google",
        }),
        findById: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: "user@example.com",
          passwordUpdatedAt: null,
        }),
        create: vi.fn().mockResolvedValue({
          id: USER_ID,
          email: "new@example.com",
          authProvider: "google",
        }),
        markEmailVerified: vi.fn().mockResolvedValue(undefined),
      },
      ...overrides.repos,
    } as never,
    authService: { recordLoginSuccess: vi.fn(), ...overrides.authService } as never,
    authLoginService: {
      consumeLoginToken: vi.fn().mockResolvedValue({
        user: { id: USER_ID, email: "user@example.com" },
        authMethod: "password",
      }),
      ...overrides.authLoginService,
    } as never,
    twoFactorService: {
      isEnabledForUser: vi.fn().mockResolvedValue(false),
      consumeSessionUpgradeToken: vi.fn().mockResolvedValue(true),
      ...overrides.twoFactorService,
    } as never,
    accountSessionService: accountSessionService as never,
    profileService: overrides.profileService as never,
  });

  return { options, accountSessionService, config };
}

describe("createAuthOptions provider registration", () => {
  it("registers Google and Apple when configured", () => {
    const { options } = buildDeps({
      config: buildTestSecureAuthConfig({
        oauth: {
          google: { clientId: "g-id", clientSecret: "g-secret" },
          apple: { clientId: "a-id", clientSecret: "a-secret" },
        },
      }),
    });
    const ids = (options.providers ?? []).map((p) => p.id);
    expect(ids).toContain("google");
    expect(ids).toContain("apple");
  });

  it("registers Microsoft when client id and tenant are valid", () => {
    const { options } = buildDeps({
      config: buildTestSecureAuthConfig({
        oauth: {
          microsoft: {
            clientId: VALID_MS_CLIENT_ID,
            clientSecret: "ms-secret",
            tenantId: "common",
          },
        },
      }),
    });
    const ids = (options.providers ?? []).map((p) => p.id);
    expect(ids).toContain("azure-ad");
  });

  it("skips Microsoft when client id format is invalid", () => {
    const { options } = buildDeps({
      config: buildTestSecureAuthConfig({
        oauth: {
          microsoft: { clientId: "not-a-guid", clientSecret: "ms-secret" },
        },
      }),
    });
    const ids = (options.providers ?? []).map((p) => p.id);
    expect(ids).not.toContain("azure-ad");
  });

  it("skips Microsoft when tenant id format is invalid", () => {
    const { options } = buildDeps({
      config: buildTestSecureAuthConfig({
        oauth: {
          microsoft: {
            clientId: VALID_MS_CLIENT_ID,
            clientSecret: "ms-secret",
            tenantId: "not-valid-tenant",
          },
        },
      }),
    });
    const ids = (options.providers ?? []).map((p) => p.id);
    expect(ids).not.toContain("azure-ad");
  });
});

describe("createAuthOptions credentials authorize", () => {
  function getLoginTokenAuthorize(options: ReturnType<typeof buildDeps>["options"]) {
    const provider = (options.providers ?? []).find(
      (p) => p.id === "login-token" || (p as { options?: { id?: string } }).options?.id === "login-token"
    ) as {
      options?: { authorize?: (credentials: { loginToken?: string }) => Promise<unknown> };
    };
    const authorize = provider?.options?.authorize;
    if (!authorize) throw new Error("login-token authorize missing");
    return authorize;
  }

  it("returns null when login token is missing", async () => {
    const { options } = buildDeps();
    const result = await getLoginTokenAuthorize(options)({});
    expect(result).toBeNull();
  });

  it("returns null when consumeLoginToken returns null", async () => {
    const { options } = buildDeps({
      authLoginService: { consumeLoginToken: vi.fn().mockResolvedValue(null) },
    });
    const result = await getLoginTokenAuthorize(options)({ loginToken: "bad" });
    expect(result).toBeNull();
  });

  it("returns user when login token is consumed", async () => {
    const { options } = buildDeps();
    const result = await getLoginTokenAuthorize(options)({ loginToken: "token" });
    expect(result).toEqual({
      id: USER_ID,
      email: "user@example.com",
      authMethod: "password",
    });
  });
});

describe("createAuthOptions signIn callback", () => {
  const signIn = async (
    deps: ReturnType<typeof buildDeps>,
    input: { user: Record<string, unknown>; account?: Record<string, unknown> }
  ) => {
    const callback = deps.options.callbacks?.signIn;
    if (!callback) throw new Error("signIn missing");
    return callback(input as never);
  };

  it("rejects login-token without email", async () => {
    const deps = buildDeps();
    const result = await signIn(deps, {
      user: { id: USER_ID },
      account: { provider: "login-token" },
    });
    expect(result).toBe(false);
  });

  it("rejects login-token when user is not in database", async () => {
    const deps = buildDeps({
      repos: {
        userRepository: { findByEmail: vi.fn().mockResolvedValue(null) },
      },
    });
    const result = await signIn(deps, {
      user: { email: "missing@example.com" },
      account: { provider: "login-token" },
    });
    expect(result).toBe(false);
  });

  it("rejects OAuth sign-in when email is missing", async () => {
    const deps = buildDeps();
    const result = await signIn(deps, {
      user: {},
      account: { provider: "google" },
    });
    expect(result).toContain("/login?error=");
  });

  it("creates a user for first-time OAuth sign-in", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "new-user",
      email: "new@example.com",
      authProvider: "google",
    });
    const markEmailVerified = vi.fn();
    const recordLoginSuccess = vi.fn();
    const deps = buildDeps({
      repos: {
        userRepository: {
          findByEmail: vi.fn().mockResolvedValue(null),
          create,
          markEmailVerified,
        },
      },
      authService: { recordLoginSuccess },
    });

    const result = await signIn(deps, {
      user: { email: "new@example.com", name: "New" },
      account: { provider: "google" },
    });

    expect(result).toBe(true);
    expect(create).toHaveBeenCalled();
    expect(markEmailVerified).toHaveBeenCalledWith("new-user");
    expect(recordLoginSuccess).toHaveBeenCalledWith("new-user", "google");
  });

  it("marks email verified for existing unverified OAuth user", async () => {
    const markEmailVerified = vi.fn();
    const deps = buildDeps({
      repos: {
        userRepository: {
          findByEmail: vi.fn().mockResolvedValue({
            id: USER_ID,
            email: "user@example.com",
            authProvider: "google",
            emailVerifiedAt: null,
          }),
          markEmailVerified,
        },
      },
    });

    const result = await signIn(deps, {
      user: { email: "user@example.com" },
      account: { provider: "google" },
    });

    expect(result).toBe(true);
    expect(markEmailVerified).toHaveBeenCalledWith(USER_ID);
  });

  it("syncs OAuth profile when profileService is provided", async () => {
    const syncFromOAuth = vi.fn().mockResolvedValue(undefined);
    const deps = buildDeps({ profileService: { syncFromOAuth } });

    await signIn(deps, {
      user: { email: "user@example.com", name: "User", image: "img" },
      account: { provider: "google" },
    });

    expect(syncFromOAuth).toHaveBeenCalledWith(USER_ID, "google", {
      name: "User",
      image: "img",
    });
  });

  it("continues when profile sync fails", async () => {
    const syncFromOAuth = vi.fn().mockRejectedValue(new Error("sync failed"));
    const deps = buildDeps({ profileService: { syncFromOAuth } });

    const result = await signIn(deps, {
      user: { email: "user@example.com" },
      account: { provider: "google" },
    });

    expect(result).toBe(true);
  });
});

describe("createAuthOptions jwt callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates token when password changed after issue", async () => {
    const passwordUpdatedAt = new Date();
    const deps = buildDeps({
      repos: {
        userRepository: {
          findByEmail: vi.fn().mockResolvedValue({
            id: USER_ID,
            email: "user@example.com",
            passwordUpdatedAt,
          }),
        },
      },
    });
    const jwt = deps.options.callbacks!.jwt!;
    const issuedBeforePasswordChange = Math.floor(passwordUpdatedAt.getTime() / 1000) - 60;

    const result = await jwt({
      token: { iat: issuedBeforePasswordChange },
      user: { email: "user@example.com" },
      account: { provider: "login-token" },
      trigger: "signIn",
    } as never);

    expect(result).toMatchObject({ sessionInvalidated: true, sub: undefined });
  });

  it("resolves sub from email when sub is missing", async () => {
    const deps = buildDeps();
    const jwt = deps.options.callbacks!.jwt!;

    const result = await jwt({
      token: { email: "user@example.com", iat: Math.floor(Date.now() / 1000) },
      trigger: "update",
    } as never);

    expect(result.sub).toBe(USER_ID);
  });

  it("invalidates inactive sessions on update", async () => {
    const deps = buildDeps({
      accountSessionService: {
        assertSessionActive: vi.fn().mockResolvedValue(false),
      },
    });
    const jwt = deps.options.callbacks!.jwt!;

    const result = await jwt({
      token: { sub: USER_ID, sid: SESSION_ID, iat: Math.floor(Date.now() / 1000) },
      trigger: "update",
    } as never);

    expect(result).toMatchObject({ sessionInvalidated: true, sub: undefined });
  });

  it("skips session enforcement when upgrade token is invalid", async () => {
    const deps = buildDeps({
      config: buildTestSecureAuthConfig({ sessions: { singleActiveSession: true } }),
      twoFactorService: {
        consumeSessionUpgradeToken: vi.fn().mockResolvedValue(false),
      },
    });
    const jwt = deps.options.callbacks!.jwt!;
    const enforce = deps.accountSessionService.enforceSingleActiveSessionOnLogin as ReturnType<
      typeof vi.fn
    >;

    await jwt({
      token: { sub: USER_ID, sid: SESSION_ID, twoFactorPending: true },
      trigger: "update",
      session: { twoFactorUpgradeToken: "bad-token" },
    } as never);

    expect(enforce).not.toHaveBeenCalled();
  });

  it("continues when session tracking throws", async () => {
    const deps = buildDeps({
      accountSessionService: {
        createSession: vi.fn().mockRejectedValue(new Error("db down")),
      },
    });
    const jwt = deps.options.callbacks!.jwt!;

    const result = await jwt({
      token: {},
      user: { id: USER_ID, email: "user@example.com" },
      account: { provider: "login-token" },
      trigger: "signIn",
    } as never);

    expect(result).toBeDefined();
  });
});

describe("createAuthOptions session callback", () => {
  it("expires session when token is invalidated", async () => {
    const deps = buildDeps();
    const sessionCb = deps.options.callbacks!.session!;

    const result = await sessionCb({
      session: { user: { email: "user@example.com" }, expires: new Date().toISOString() },
      token: { sessionInvalidated: true },
    } as never);

    expect(result.user).toBeUndefined();
    expect(new Date(result.expires).getTime()).toBe(0);
  });

  it("maps token fields onto session", async () => {
    const deps = buildDeps();
    const sessionCb = deps.options.callbacks!.session!;

    const result = (await sessionCb({
      session: { user: { email: "user@example.com" }, expires: new Date().toISOString() },
      token: {
        sub: USER_ID,
        sid: SESSION_ID,
        twoFactorPending: true,
        twoFactorVerified: false,
        emailVerificationRequired: true,
      },
    } as never)) as {
      user?: { id?: string };
      accountSessionId?: string;
      twoFactorPending?: boolean;
      emailVerificationRequired?: boolean;
    };

    expect(result.user?.id).toBe(USER_ID);
    expect(result.accountSessionId).toBe(SESSION_ID);
    expect(result.twoFactorPending).toBe(true);
    expect(result.emailVerificationRequired).toBe(true);
  });
});

describe("createAuthOptions signOut event", () => {
  it("revokes account session on sign-out", async () => {
    const deps = buildDeps();
    const signOut = deps.options.events!.signOut!;

    await signOut({
      token: { sub: USER_ID, sid: SESSION_ID },
    } as never);

    expect(deps.accountSessionService.revokeOnSignOut).toHaveBeenCalledWith(
      USER_ID,
      SESSION_ID
    );
  });

  it("skips revoke when user id is missing", async () => {
    const deps = buildDeps();
    const signOut = deps.options.events!.signOut!;

    await signOut({ token: {} } as never);

    expect(deps.accountSessionService.revokeOnSignOut).not.toHaveBeenCalled();
  });

  it("swallows revoke errors", async () => {
    const deps = buildDeps({
      accountSessionService: {
        revokeOnSignOut: vi.fn().mockRejectedValue(new Error("revoke failed")),
      },
    });
    const signOut = deps.options.events!.signOut!;

    await expect(
      signOut({ token: { sub: USER_ID, sid: SESSION_ID } } as never)
    ).resolves.toBeUndefined();
  });
});
