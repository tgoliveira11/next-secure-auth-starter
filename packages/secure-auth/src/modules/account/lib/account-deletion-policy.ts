import type { AccountAuthMethod } from "@/modules/sessions/lib/account-session-types";
import { isOAuthOnlyProvider } from "@/modules/auth/lib/oauth-sign-in-policy";
import { ReauthenticationRequiredError } from "@/modules/account/lib/account-errors";

/** Recent sign-in window required before passwordless account deletion. */
export const ACCOUNT_DELETION_REAUTH_WINDOW_MS = 15 * 60 * 1000;

export type AccountDeletionSession = {
  authMethod: string;
  lastUsedAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  expiresAt: Date;
};

export function mapUserAuthProviderToSessionMethod(authProvider: string): AccountAuthMethod | null {
  switch (authProvider) {
    case "google":
      return "google";
    case "apple":
      return "apple";
    case "microsoft":
    case "azure-ad":
      return "microsoft";
    default:
      return null;
  }
}

function normalizeAuthMethod(value: string): AccountAuthMethod {
  switch (value) {
    case "password":
    case "google":
    case "apple":
    case "microsoft":
    case "passkey":
      return value;
    default:
      return "unknown";
  }
}

function assertActiveDeletionSession(
  session: AccountDeletionSession | null | undefined
): asserts session is AccountDeletionSession {
  if (!session) {
    throw new ReauthenticationRequiredError(
      "Your session is no longer valid. Sign in again before deleting your account."
    );
  }
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new ReauthenticationRequiredError(
      "Your session is no longer valid. Sign in again before deleting your account."
    );
  }
}

function assertRecentSessionActivity(session: AccountDeletionSession): void {
  const lastAuthAt = Math.max(session.lastUsedAt.getTime(), session.createdAt.getTime());
  if (Date.now() - lastAuthAt > ACCOUNT_DELETION_REAUTH_WINDOW_MS) {
    throw new ReauthenticationRequiredError(
      "Sign in again before deleting your account. Account deletion requires a recent sign-in."
    );
  }
}

/**
 * Passwordless deletion requires a live account session that was established with the same
 * primary authentication factor as the account (OAuth provider or passkey).
 */
export function assertPasswordlessDeletionAllowed(input: {
  user: { authProvider: string; passwordHash: string | null };
  accountSessionId?: string;
  accountSession: AccountDeletionSession | null;
}): void {
  if (input.user.passwordHash) {
    return;
  }

  if (!input.accountSessionId) {
    throw new ReauthenticationRequiredError("Sign in again before deleting your account.");
  }

  assertActiveDeletionSession(input.accountSession);
  assertRecentSessionActivity(input.accountSession);

  const sessionMethod = normalizeAuthMethod(input.accountSession.authMethod);

  if (isOAuthOnlyProvider(input.user.authProvider)) {
    const expectedMethod = mapUserAuthProviderToSessionMethod(input.user.authProvider);
    if (!expectedMethod) {
      throw new ReauthenticationRequiredError(
        "Account deletion requires re-authentication with your sign-in provider."
      );
    }
    if (sessionMethod !== expectedMethod) {
      throw new ReauthenticationRequiredError(
        "Sign in with your original sign-in method before deleting this account."
      );
    }
    return;
  }

  if (input.user.authProvider === "credentials") {
    if (sessionMethod !== "passkey") {
      throw new ReauthenticationRequiredError("Sign in with your passkey before deleting this account.");
    }
    return;
  }

  throw new ReauthenticationRequiredError("Account deletion requires re-authentication.");
}