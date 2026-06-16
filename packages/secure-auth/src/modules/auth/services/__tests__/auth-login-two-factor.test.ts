import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthLoginService } from "../auth-login-service";
import { USER_ID } from "@/test/helpers/fixtures";

const mocks = vi.hoisted(() => ({
  consumeLoginChallenge: vi.fn(),
  verifyLoginCode: vi.fn(),
  createLoginToken: vi.fn(),
  record: vi.fn(),
  recordLoginSuccess: vi.fn(),
  issueLoginToken: vi.fn(),
  enforceRateLimit: vi.fn(),
  createOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
  findById: vi.fn(),
}));

function buildService() {
  const service = createAuthLoginService({
    config: {} as never,
    ctx: {
      createOpaqueToken: mocks.createOpaqueToken,
      hashOpaqueToken: mocks.hashOpaqueToken,
    } as never,
    repos: {
      twoFactorRepository: {
        consumeLoginChallenge: mocks.consumeLoginChallenge,
        createLoginToken: mocks.createLoginToken,
      },
      auditRepository: {
        record: mocks.record,
      },
      userRepository: {
        findById: mocks.findById,
      },
    } as never,
    rateLimit: {
      enforceRateLimit: mocks.enforceRateLimit,
    } as never,
    authService: {
      recordLoginSuccess: mocks.recordLoginSuccess,
    } as never,
    twoFactorService: {
      verifyLoginCode: mocks.verifyLoginCode,
    } as never,
  });

  mocks.issueLoginToken.mockImplementation((userId: string, authMethod: string) =>
    service.issueLoginToken(userId, authMethod as "password" | "passkey")
  );

  return service;
}

describe("authLoginService.verifyTwoFactorLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashOpaqueToken.mockReturnValue("hash");
    mocks.consumeLoginChallenge.mockResolvedValue({
      userId: USER_ID,
      authProvider: "passkey",
    });
    mocks.verifyLoginCode.mockResolvedValue(true);
    mocks.createOpaqueToken.mockReturnValue("login-token-1234567890");
    mocks.createLoginToken.mockResolvedValue({ id: "token-row" });
    mocks.findById.mockResolvedValue({ id: USER_ID, email: "user@example.com" });
  });

  it("issues passkey login token after TOTP when challenge authProvider is passkey", async () => {
    const service = buildService();
    const issueSpy = vi.spyOn(service, "issueLoginToken");

    const result = await service.verifyTwoFactorLogin("challenge-token", { code: "123456" });

    expect(result.loginToken).toBe("login-token-1234567890");
    expect(issueSpy).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "passkey");
    expect(mocks.record).toHaveBeenCalledWith(
      "two_factor_login_passed",
      USER_ID,
      expect.objectContaining({ provider: "passkey" })
    );
  });

  it("issues password login token when challenge authProvider is credentials", async () => {
    mocks.consumeLoginChallenge.mockResolvedValue({
      userId: USER_ID,
      authProvider: "credentials",
    });
    const service = buildService();
    const issueSpy = vi.spyOn(service, "issueLoginToken");

    await service.verifyTwoFactorLogin("challenge-token", { code: "123456" });

    expect(issueSpy).toHaveBeenCalledWith(USER_ID, "password");
    expect(mocks.recordLoginSuccess).toHaveBeenCalledWith(USER_ID, "credentials");
  });
});
