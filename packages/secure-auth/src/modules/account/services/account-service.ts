import type { RunInTransaction } from "@/lib/db/transaction";
import { verifyPassword } from "@/modules/security/policies/password-hashing";
import { RateLimitError } from "@/modules/rate-limit/index";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/modules/account/lib/account-deletion";
import { assertPasswordlessDeletionAllowed } from "@/modules/account/lib/account-deletion-policy";
import {
  NotFoundError,
  ReauthenticationRequiredError,
  ValidationError,
} from "@/modules/account/lib/account-errors";
import type { SecureAuthRepositories } from "@/core/create-repositories";
import type { RateLimitApi } from "@/modules/rate-limit/index";

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

type AccountServiceDeps = {
  repos: SecureAuthRepositories;
  rateLimit: RateLimitApi;
  runInTransaction: RunInTransaction;
};

export function createAccountService(deps: AccountServiceDeps) {
  const { repos, rateLimit, runInTransaction } = deps;

  return {
    async getDeletionRequirements(userId: string) {
      const user = await repos.userRepository.findById(userId);
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
      const user = await repos.userRepository.findById(userId);
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
          ? await repos.accountSessionRepository.findByIdForUser(
              context.accountSessionId,
              userId
            )
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

      await rateLimit.enforceRateLimit({
        operation: "account.delete",
        userId,
        ip: context.ip,
        endpoint: "/api/account",
      });

      await repos.auditRepository.record("account_deletion_requested", userId, {
        endpoint: "/api/account",
        authProvider: user.authProvider,
        method: user.passwordHash ? "password" : "session",
      });

      await runInTransaction(async (tx) => {
        await repos.userRepository.deleteById(userId, tx);
      });

      return { success: true };
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
