import type { RunInTransaction } from "@/lib/db/transaction";
import { hashPassword, verifyPassword } from "@/modules/security/policies/password-hashing";
import { GENERIC_FORGOT_PASSWORD_MESSAGE } from "@/modules/account/lib/account-auth-messages";
import { isCredentialsAccount } from "@/modules/account/lib/account-policy-config";
import {
  NotFoundError,
  ReauthenticationRequiredError,
  ValidationError,
} from "@/modules/account/lib/account-errors";
import type { SecureAuthContext } from "@/core/create-secure-auth-context";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";
import type { AccountTokenType } from "@/modules/account/repositories/account-token-repository";
import type { SecurityNotificationService } from "@/modules/security/notifications/security-notification-service";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type AccountAuthServiceDeps = {
  ctx: SecureAuthContext;
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  runInTransaction: RunInTransaction;
  securityNotificationService?: SecurityNotificationService;
};

export function createAccountAuthService(deps: AccountAuthServiceDeps) {
  const { ctx, repos, rateLimit, runInTransaction, securityNotificationService } = deps;

  async function issueAccountToken(
    userId: string,
    email: string,
    type: AccountTokenType,
    ttlMs: number
  ) {
    await repos.accountTokenRepository.revokeActiveTokensForUser(userId, type);
    const token = ctx.createOpaqueToken();
    const tokenHash = ctx.hashOpaqueToken(token);
    await repos.accountTokenRepository.create({
      userId,
      email,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return token;
  }

  return {
    async sendVerificationEmailForUser(userId: string, ip?: string) {
      const user = await repos.userRepository.findById(userId);
      if (!user || !isCredentialsAccount(user)) {
        throw new NotFoundError("Account not found");
      }
      if (user.emailVerifiedAt) {
        return { alreadyVerified: true as const };
      }

      await rateLimit.enforceRateLimit({
        operation: "auth.verify_email_resend",
        userId,
        ip,
        endpoint: "/api/auth/verify-email/resend",
      });

      const token = await issueAccountToken(
        user.id,
        user.email,
        "email_verification",
        EMAIL_VERIFICATION_TTL_MS
      );
      const content = ctx.verificationEmailContent(token);
      await ctx.deliverAccountEmail({ to: user.email, ...content });
      await repos.auditRepository.record("email_verification_requested", user.id, {
        endpoint: "/api/auth/verify-email/resend",
      });
      return { alreadyVerified: false as const };
    },

    async resendVerificationByEmail(email: string, ip?: string) {
      const emailScope = ctx.hashEmailForScope(email);
      await rateLimit.enforceRateLimit({
        operation: "auth.verify_email_resend",
        userId: emailScope,
        ip,
        endpoint: "/api/auth/verify-email/resend",
        keyMode: "email",
      });

      const user = await repos.userRepository.findByEmail(email);
      if (user && isCredentialsAccount(user) && !user.emailVerifiedAt) {
        const token = await issueAccountToken(
          user.id,
          user.email,
          "email_verification",
          EMAIL_VERIFICATION_TTL_MS
        );
        const content = ctx.verificationEmailContent(token);
        await ctx.deliverAccountEmail({ to: user.email, ...content });
        await repos.auditRepository.record("email_verification_requested", user.id, {
          endpoint: "/api/auth/verify-email/resend",
        });
      }

      return { message: "If your account needs verification, we sent a new link." };
    },

    async confirmEmailVerification(token: string, ip?: string) {
      await rateLimit.enforceRateLimit({
        operation: "auth.verify_email_confirm",
        ip,
        endpoint: "/api/auth/verify-email/confirm",
        keyMode: "ip",
      });

      const tokenHash = ctx.hashOpaqueToken(token);
      const row = await repos.accountTokenRepository.consumeValidToken(
        tokenHash,
        "email_verification"
      );
      if (!row?.userId) {
        await repos.auditRepository.record("email_verification_failed", undefined, {
          endpoint: "/api/auth/verify-email/confirm",
          errorCode: "invalid_or_expired",
        });
        throw new ValidationError("This verification link is invalid or expired.");
      }

      const user = await repos.userRepository.findById(row.userId);
      if (!user) {
        throw new ValidationError("This verification link is invalid or expired.");
      }

      if (!user.emailVerifiedAt) {
        await repos.userRepository.markEmailVerified(user.id);
      }
      await repos.auditRepository.record("email_verified", user.id, {
        endpoint: "/api/auth/verify-email/confirm",
      });
      return { verified: true, email: user.email };
    },

    async requestPasswordReset(email: string, ip?: string) {
      const emailScope = ctx.hashEmailForScope(email);
      await rateLimit.enforceRateLimit({
        operation: "auth.forgot_password",
        userId: emailScope,
        ip,
        endpoint: "/api/auth/forgot-password",
        keyMode: "email_ip",
      });

      const user = await repos.userRepository.findByEmail(email);
      if (user && isCredentialsAccount(user)) {
        const token = await issueAccountToken(
          user.id,
          user.email,
          "password_reset",
          PASSWORD_RESET_TTL_MS
        );
        const content = ctx.passwordResetEmailContent(token);
        await ctx.deliverAccountEmail({ to: user.email, ...content });
        await repos.auditRepository.record("password_reset_requested", user.id, {
          endpoint: "/api/auth/forgot-password",
        });
      }

      return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
    },

    async validatePasswordResetToken(token: string) {
      const tokenHash = ctx.hashOpaqueToken(token);
      const row = await repos.accountTokenRepository.findValidToken(tokenHash, "password_reset");
      return { valid: Boolean(row) };
    },

    async resetPassword(token: string, newPassword: string, ip?: string) {
      await rateLimit.enforceRateLimit({
        operation: "auth.reset_password",
        ip,
        endpoint: "/api/auth/reset-password",
        keyMode: "ip",
      });

      const policy = ctx.validatePasswordForSubmission(newPassword);
      if (!policy.valid) {
        throw new ValidationError(
          policy.assessment.messages[0] ?? "Password does not meet the configured policy."
        );
      }

      const tokenHash = ctx.hashOpaqueToken(token);
      const row = await runInTransaction(async (tx) => {
        const consumed = await repos.accountTokenRepository.consumeValidToken(
          tokenHash,
          "password_reset",
          tx
        );
        if (!consumed?.userId) return null;

        const user = await repos.userRepository.findById(consumed.userId);
        if (!user || !isCredentialsAccount(user)) return null;

        const passwordHash = await hashPassword(newPassword);
        await repos.userRepository.updatePassword(user.id, passwordHash, tx);
        return consumed;
      });

      if (!row?.userId) {
        await repos.auditRepository.record("password_reset_failed", undefined, {
          endpoint: "/api/auth/reset-password",
          errorCode: "invalid_or_expired",
        });
        throw new ValidationError("This reset link is invalid or expired.");
      }

      await repos.auditRepository.record("password_reset_completed", row.userId, {
        endpoint: "/api/auth/reset-password",
      });
      const resetUser = await repos.userRepository.findById(row.userId);
      if (resetUser) {
        void securityNotificationService?.notifySecurityEvent({
          type: "password_changed",
          userId: resetUser.id,
          userEmail: resetUser.email,
        });
      }
      return { success: true };
    },

    async changePassword(
      userId: string,
      input: { currentPassword: string; newPassword: string },
      ip?: string
    ) {
      await rateLimit.enforceRateLimit({
        operation: "account.password_change",
        userId,
        ip,
        endpoint: "/api/account/change-password",
      });

      const user = await repos.userRepository.findById(userId);
      if (!user) throw new NotFoundError("Account not found");
      if (!user.passwordHash) {
        throw new ValidationError(
          "This account signs in with Google, Apple, GitHub, or Microsoft. Password change is not available unless you add an email/password sign-in method."
        );
      }

      const currentValid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!currentValid) {
        await repos.auditRepository.record("password_change_failed", userId, {
          endpoint: "/api/account/change-password",
          errorCode: "incorrect_current_password",
        });
        throw new ReauthenticationRequiredError("Current password is incorrect.");
      }

      const policy = ctx.validatePasswordForSubmission(input.newPassword);
      if (!policy.valid) {
        await repos.auditRepository.record("password_change_failed", userId, {
          endpoint: "/api/account/change-password",
          errorCode: "policy_rejected",
        });
        throw new ValidationError(
          policy.assessment.messages[0] ?? "Password does not meet the configured policy."
        );
      }

      const passwordHash = await hashPassword(input.newPassword);
      await repos.userRepository.updatePassword(userId, passwordHash);
      await repos.auditRepository.record("password_changed", userId, {
        endpoint: "/api/account/change-password",
      });
      void securityNotificationService?.notifySecurityEvent({
        type: "password_changed",
        userId: user.id,
        userEmail: user.email,
      });
      return { success: true };
    },

    async getAccountAuthStatus(userId: string) {
      const user = await repos.userRepository.findById(userId);
      if (!user) throw new NotFoundError("Account not found");
      return {
        email: user.email,
        authProvider: user.authProvider,
        hasPassword: Boolean(user.passwordHash),
        emailVerified: Boolean(user.emailVerifiedAt),
        canChangePassword: Boolean(user.passwordHash),
      };
    },
  };
}

export type AccountAuthService = ReturnType<typeof createAccountAuthService>;
