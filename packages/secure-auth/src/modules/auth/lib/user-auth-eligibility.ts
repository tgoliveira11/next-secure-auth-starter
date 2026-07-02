import "server-only";

/** User row fields required to decide whether sign-in may proceed. */
export type AuthenticatableUser = {
  status: string;
};

/**
 * Ensures only active accounts may authenticate.
 * Uses a generic failure mode — callers map to InvalidCredentialsError or equivalent.
 */
export function assertUserMayAuthenticate(user: AuthenticatableUser): void {
  if (user.status !== "active") {
    throw new AccountNotActiveError();
  }
}

export class AccountNotActiveError extends Error {
  constructor() {
    super("Account is not active");
    this.name = "AccountNotActiveError";
  }
}
