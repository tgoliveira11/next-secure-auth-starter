import { runInTransaction } from "@/lib/db/transaction";
import { userRepository } from "@/modules/account/repositories/user-repository";
import { auditRepository } from "@/modules/audit/repositories/audit-repository";
import { accountSessionRepository } from "@/modules/sessions/repositories/account-session-repository";
import { verifyPassword } from "@/modules/security/policies/password-hashing";
import { enforceRateLimit, RateLimitError } from "@/modules/rate-limit/index";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/modules/account/lib/account-deletion";
import { assertPasswordlessDeletionAllowed } from "@/modules/account/lib/account-deletion-policy";
import {
  NotFoundError,
  ReauthenticationRequiredError,
  ValidationError,
} from "@/modules/account/lib/account-errors";

export { ACCOUNT_DELETION_CONFIRMATION_PHRASE };
export {
  NotFoundError,
  ValidationError,
  ReauthenticationRequiredError,
} from "@/modules/account/lib/account-errors";
export { EmailVerificationRequiredError } from "@/modules/account/lib/account-policy-config";
export { RateLimitError };

export type DeleteAccountContext = {
  ip?: string;
  accountSessionId?: string;
};

export const accountService = {
  async getDeletionRequirements(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    return {
      requiresPassword: Boolean(user.passwordHash),
      authProvider: user.authProvider,
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
    };
  },

  async deleteAccount(
    userId: string,
    input: { confirmationPhrase: string; password?: string },
    context: DeleteAccountContext = {}
  ) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Account not found");

    if (input.confirmationPhrase !== ACCOUNT_DELETION_CONFIRMATION_PHRASE) {
      throw new ValidationError("Confirmation phrase does not match");
    }

    if (user.passwordHash) {
      if (!input.password) {
        throw new ReauthenticationRequiredError("Password is required to delete this account");
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new ReauthenticationRequiredError("Incorrect password");
      }
    } else {
      const accountSession = context.accountSessionId
        ? await accountSessionRepository.findByIdForUser(context.accountSessionId, userId)
        : null;

      assertPasswordlessDeletionAllowed({
        user: { authProvider: user.authProvider, passwordHash: user.passwordHash },
        accountSessionId: context.accountSessionId,
        accountSession: accountSession
          ? {
              authMethod: accountSession.authMethod,
              lastUsedAt: accountSession.lastUsedAt,
              createdAt: accountSession.createdAt,
              revokedAt: accountSession.revokedAt,
              expiresAt: accountSession.expiresAt,
            }
          : null,
      });
    }

    await enforceRateLimit({
      operation: "account.delete",
      userId,
      ip: context.ip,
      endpoint: "/api/account",
    });

    await auditRepository.record("account_deletion_requested", userId, {
      endpoint: "/api/account",
      authProvider: user.authProvider,
      method: user.passwordHash ? "password" : "session",
    });

    await runInTransaction(async (tx) => {
      await userRepository.deleteById(userId, tx);
    });

    return { success: true };
  },
};