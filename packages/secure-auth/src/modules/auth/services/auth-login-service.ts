import {
  TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS,
  TWO_FACTOR_LOGIN_TOKEN_TTL_MS,
} from "@/modules/two-factor/lib/constants";
import { verifyPassword } from "@/modules/security/policies/password-hashing";
import { RateLimitError } from "@/modules/rate-limit/index";
import { assertCredentialsEmailVerifiedForSignIn } from "@/modules/account/lib/account-policy-config";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { AuthService } from "./auth-service";
import type { TwoFactorService } from "@/modules/two-factor/services/two-factor-service";
import type { LockoutService } from "@/modules/admin/services/lockout-service";
import { AccountFrozenError, AccountLockedError } from "@/modules/admin/services/lockout-service";

function loginTokenAuthMethod(authProvider: string): "password" | "passkey" {
  return authProvider === "passkey" ? "passkey" : "password";
}

type AuthLoginServiceDeps = {
  config: SecureAuthContext["config"];
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  authService: AuthService;
  twoFactorService: TwoFactorService;
  lockoutService?: LockoutService;
};

export function createAuthLoginService(deps: AuthLoginServiceDeps) {
  const { config, ctx, repos, rateLimit, authService, twoFactorService, lockoutService } = deps;

  const service = {
    async startCredentialsLogin(email: string, password: string, ip?: string) {
      const normalizedEmail = email.trim().toLowerCase();

      // Check lockout state before attempting authentication
      if (lockoutService) {
        const state = await lockoutService.getState(normalizedEmail);
        if (state.status === "frozen") throw new AccountFrozenError(state.retryAfterSeconds);
        if (state.status === "locked") throw new AccountLockedError();
      }

      await authService.assertLoginAllowed(normalizedEmail, ip);

      const user = await repos.userRepository.findByEmail(normalizedEmail);
      if (!user?.passwordHash) {
        await authService.recordLoginFailure(normalizedEmail);
        if (lockoutService) await lockoutService.recordFailure(normalizedEmail);
        throw new InvalidCredentialsError();
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        await authService.recordLoginFailure(normalizedEmail);
        if (lockoutService) {
          const newState = await lockoutService.recordFailure(normalizedEmail, user.id);
          if (newState.status === "frozen") throw new AccountFrozenError(newState.retryAfterSeconds);
          if (newState.status === "locked") throw new AccountLockedError();
        }
        throw new InvalidCredentialsError();
      }

      // Successful auth — reset lockout counter
      if (lockoutService) await lockoutService.recordSuccess(normalizedEmail, user.id);

      assertCredentialsEmailVerifiedForSignIn(user, config);

      const twoFactorEnabled = await twoFactorService.isEnabledForUser(user.id);
      if (twoFactorEnabled) {
        const challengeToken = ctx.createOpaqueToken();
        const challengeTokenHash = ctx.hashOpaqueToken(challengeToken);
        await repos.twoFactorRepository.createLoginChallenge({
          userId: user.id,
          challengeTokenHash,
          authProvider: "credentials",
          expiresAt: new Date(Date.now() + TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS),
        });

        return {
          requiresTwoFactor: true as const,
          challengeToken,
        };
      }

      const loginToken = await service.issueLoginToken(user.id, "password");
      await authService.recordLoginSuccess(user.id, "credentials");
      return {
        requiresTwoFactor: false as const,
        loginToken,
      };
    },

    async verifyTwoFactorLogin(
      challengeToken: string,
      input: { code?: string; backupCode?: string },
      ip?: string
    ) {
      const challengeTokenHash = ctx.hashOpaqueToken(challengeToken);
      const challenge = await repos.twoFactorRepository.consumeLoginChallenge(challengeTokenHash);
      if (!challenge) {
        throw new InvalidTwoFactorChallengeError();
      }

      await rateLimit.enforceRateLimit({
        operation: "two_factor.login_verify",
        userId: challenge.userId,
        ip,
        endpoint: "/api/auth/login/verify-2fa",
        keyMode: "email",
      });

      const verified = await twoFactorService.verifyLoginCode(challenge.userId, input);
      if (!verified) {
        await repos.auditRepository.record("two_factor_login_failed", challenge.userId, {
          endpoint: "/api/auth/login/verify-2fa",
          errorCode: "invalid_code",
        });
        throw new InvalidTwoFactorCodeError();
      }

      await repos.auditRepository.record("two_factor_login_passed", challenge.userId, {
        endpoint: "/api/auth/login/verify-2fa",
        provider: challenge.authProvider,
      });

      const loginToken = await service.issueLoginToken(
        challenge.userId,
        loginTokenAuthMethod(challenge.authProvider)
      );
      await authService.recordLoginSuccess(challenge.userId, challenge.authProvider);
      return { loginToken };
    },

    async verifyOAuthTwoFactor(
      userId: string,
      input: { code?: string; backupCode?: string },
      ip?: string
    ) {
      await rateLimit.enforceRateLimit({
        operation: "two_factor.login_verify",
        userId,
        ip,
        endpoint: "/api/auth/login/verify-2fa-oauth",
        keyMode: "email",
      });

      const verified = await twoFactorService.verifyLoginCode(userId, input);
      if (!verified) {
        await repos.auditRepository.record("two_factor_login_failed", userId, {
          endpoint: "/api/auth/login/verify-2fa-oauth",
          errorCode: "invalid_code",
        });
        throw new InvalidTwoFactorCodeError();
      }

      await repos.auditRepository.record("two_factor_login_passed", userId, {
        endpoint: "/api/auth/login/verify-2fa-oauth",
        provider: "oauth",
      });

      const upgradeToken = await twoFactorService.createSessionUpgradeToken(userId);
      return { upgradeToken };
    },

    async issueLoginToken(userId: string, authMethod: "password" | "passkey" = "password") {
      const loginToken = ctx.createOpaqueToken();
      const tokenHash = ctx.hashOpaqueToken(loginToken);
      await repos.twoFactorRepository.createLoginToken({
        userId,
        tokenHash,
        authMethod,
        expiresAt: new Date(Date.now() + TWO_FACTOR_LOGIN_TOKEN_TTL_MS),
      });
      return loginToken;
    },

    async consumeLoginToken(loginToken: string) {
      const tokenHash = ctx.hashOpaqueToken(loginToken);
      const row = await repos.twoFactorRepository.consumeLoginToken(tokenHash);
      if (!row) return null;
      const user = await repos.userRepository.findById(row.userId);
      if (!user) return null;
      return { user, authMethod: row.authMethod ?? "password" };
    },
  };

  return service;
}

export type AuthLoginService = ReturnType<typeof createAuthLoginService>;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidTwoFactorChallengeError extends Error {
  constructor() {
    super("Login challenge expired or invalid");
    this.name = "InvalidTwoFactorChallengeError";
  }
}

export class InvalidTwoFactorCodeError extends Error {
  constructor() {
    super("Invalid authenticator or backup code");
    this.name = "InvalidTwoFactorCodeError";
  }
}

export { RateLimitError };
export { AccountFrozenError, AccountLockedError } from "@/modules/admin/services/lockout-service";
