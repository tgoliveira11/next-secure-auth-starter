import { describe, it, expect, vi } from "vitest";
import { AccountNotActiveError, assertUserMayAuthenticate } from "@/modules/auth/lib/user-auth-eligibility";
import { InvalidCredentialsError } from "@/modules/auth/services/auth-login-service";
import { createAuthLoginService } from "@/modules/auth/services/auth-login-service";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

vi.mock("@/modules/security/policies/password-hashing", () => ({
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

describe("auth login service account status", () => {
  it("rejects suspended users during credentials login", async () => {
    const config = buildTestSecureAuthConfig();
    const service = createAuthLoginService({
      config,
      ctx: {
        validatePasswordForSubmission: () => ({ valid: true, assessment: { messages: [] } }),
        hashOpaqueToken: () => "hash",
        createOpaqueToken: () => "token",
      } as never,
      repos: {
        userRepository: {
          findByEmail: vi.fn().mockResolvedValue({
            id: "user-1",
            email: "user@example.com",
            passwordHash: "$2b$12$hash",
            status: "suspended",
            emailVerifiedAt: new Date(),
          }),
        },
        twoFactorRepository: {
          createLoginChallenge: vi.fn(),
          createLoginToken: vi.fn(),
        },
        auditRepository: { record: vi.fn() },
      } as never,
      rateLimit: { enforceRateLimit: vi.fn() } as never,
      authService: {
        assertLoginAllowed: vi.fn(),
        recordLoginFailure: vi.fn(),
        recordLoginSuccess: vi.fn(),
      } as never,
      twoFactorService: { isEnabledForUser: vi.fn().mockResolvedValue(false) } as never,
    });

    await expect(
      service.startCredentialsLogin("user@example.com", "password123")
    ).rejects.toBeInstanceOf(AccountNotActiveError);
  });

  it("maps account status failures to invalid credentials at route layer", () => {
    expect(() => assertUserMayAuthenticate({ status: "active" })).not.toThrow();
    expect(() => assertUserMayAuthenticate({ status: "suspended" })).toThrow(AccountNotActiveError);
    expect(new InvalidCredentialsError().message).toBe("Invalid email or password");
  });
});
