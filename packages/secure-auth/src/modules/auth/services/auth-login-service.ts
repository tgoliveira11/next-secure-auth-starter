import {
  TWO_FACTOR_LOGIN_CHALLENGE_TTL_MS,
  TWO_FACTOR_LOGIN_TOKEN_TTL_MS,
} from "@/modules/two-factor/lib/constants";
import { auditRepository } from "@/modules/audit/repositories/audit-repository";
import { userRepository } from "@/modules/account/repositories/user-repository";
import { twoFactorRepository } from "@/modules/two-factor/repositories/two-factor-repository";
import { verifyPassword } from "@/modules/security/policies/password-hashing";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/security/policies/login-token";
import { enforceRateLimit, RateLimitError } from "@/modules/rate-limit/index";
import { authService } from "@/modules/auth/services/auth-service";
import { twoFactorService } from "@/modules/two-factor/services/two-factor-service";
import { assertCredentialsEmailVerifiedForSignIn } from "@/modules/account/lib/account-policy-config";

export const authLoginService = {
  async startCredentialsLogin(email: string, password: string, ip?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    await authService.assertLoginAllowed(normalizedEmail, ip);

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user?.passwordHash) {
      await authService.recordLoginFailure(normalizedEmail);
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await authService.recordLoginFailure(normalizedEmail);
      throw new InvalidCredentialsError();
    }

    assertCredentialsEmailVerifiedForSignIn(user);

    const twoFactorEnabled = await twoFactorService.isEnabledForUser(user.id);
    if (twoFactorEnabled) {
      const challengeToken = createOpaqueToken();
      const challengeTokenHash = hashOpaqueToken(challengeToken);
      await twoFactorRepository.createLoginChallenge({
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

    const loginToken = await authLoginService.issueLoginToken(user.id, "password");
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
    const challengeTokenHash = hashOpaqueToken(challengeToken);
    const challenge = await twoFactorRepository.consumeLoginChallenge(challengeTokenHash);
    if (!challenge) {
      throw new InvalidTwoFactorChallengeError();
    }

    await enforceRateLimit({
      operation: "two_factor.login_verify",
      userId: challenge.userId,
      ip,
      endpoint: "/api/auth/login/verify-2fa",
      keyMode: "email",
    });

    const verified = await twoFactorService.verifyLoginCode(challenge.userId, input);
    if (!verified) {
      await auditRepository.record("two_factor_login_failed", challenge.userId, {
        endpoint: "/api/auth/login/verify-2fa",
        errorCode: "invalid_code",
      });
      throw new InvalidTwoFactorCodeError();
    }

    await auditRepository.record("two_factor_login_passed", challenge.userId, {
      endpoint: "/api/auth/login/verify-2fa",
      provider: challenge.authProvider,
    });

    const loginToken = await authLoginService.issueLoginToken(challenge.userId, "password");
    await authService.recordLoginSuccess(challenge.userId, challenge.authProvider);
    return { loginToken };
  },

  async verifyOAuthTwoFactor(
    userId: string,
    input: { code?: string; backupCode?: string },
    ip?: string
  ) {
    await enforceRateLimit({
      operation: "two_factor.login_verify",
      userId,
      ip,
      endpoint: "/api/auth/login/verify-2fa-oauth",
      keyMode: "email",
    });

    const verified = await twoFactorService.verifyLoginCode(userId, input);
    if (!verified) {
      await auditRepository.record("two_factor_login_failed", userId, {
        endpoint: "/api/auth/login/verify-2fa-oauth",
        errorCode: "invalid_code",
      });
      throw new InvalidTwoFactorCodeError();
    }

    await auditRepository.record("two_factor_login_passed", userId, {
      endpoint: "/api/auth/login/verify-2fa-oauth",
      provider: "oauth",
    });

    const upgradeToken = await twoFactorService.createSessionUpgradeToken(userId);
    return { upgradeToken };
  },

  async issueLoginToken(userId: string, authMethod: "password" | "passkey" = "password") {
    const loginToken = createOpaqueToken();
    const tokenHash = hashOpaqueToken(loginToken);
    await twoFactorRepository.createLoginToken({
      userId,
      tokenHash,
      authMethod,
      expiresAt: new Date(Date.now() + TWO_FACTOR_LOGIN_TOKEN_TTL_MS),
    });
    return loginToken;
  },

  async consumeLoginToken(loginToken: string) {
    const tokenHash = hashOpaqueToken(loginToken);
    const row = await twoFactorRepository.consumeLoginToken(tokenHash);
    if (!row) return null;
    const user = await userRepository.findById(row.userId);
    if (!user) return null;
    return { user, authMethod: row.authMethod ?? "password" };
  },
};

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