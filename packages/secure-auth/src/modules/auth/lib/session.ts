import "server-only";
import { getServerSession } from "next-auth";
import { accountApisRequireEmailVerification } from "@/modules/account/lib/account-policy-config";
import type { SecureAuthServices } from "@/core/types";

export type SessionUser = {
  id: string;
  email: string;
  accountSessionId?: string;
  twoFactorVerified: boolean;
  twoFactorPending: boolean;
  emailVerificationRequired: boolean;
};

export type VerifiedSessionUser = {
  id: string;
  email: string;
  accountSessionId?: string;
};

export async function getSessionUser(services: SecureAuthServices): Promise<SessionUser | null> {
  const session = await getServerSession(services.getAuthOptions());
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    accountSessionId: session.accountSessionId,
    twoFactorVerified: session.twoFactorVerified !== false,
    twoFactorPending: session.twoFactorPending === true,
    emailVerificationRequired: session.emailVerificationRequired === true,
  };
}

export async function requireSessionUser(services: SecureAuthServices): Promise<SessionUser> {
  const user = await getSessionUser(services);
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  return user;
}

export async function requireFullyAuthenticatedUser(
  services: SecureAuthServices
): Promise<VerifiedSessionUser> {
  const user = await requireSessionUser(services);
  if (!user.twoFactorVerified || user.twoFactorPending) {
    throw new UnauthorizedError("Two-factor verification required");
  }
  return {
    id: user.id,
    email: user.email,
    accountSessionId: user.accountSessionId,
  };
}

export async function requireVerifiedFullyAuthenticatedUser(
  services: SecureAuthServices
): Promise<VerifiedSessionUser> {
  const user = await requireSessionUser(services);
  if (!user.twoFactorVerified || user.twoFactorPending) {
    throw new UnauthorizedError("Two-factor verification required");
  }

  if (
    accountApisRequireEmailVerification(services.config) &&
    user.emailVerificationRequired
  ) {
    throw new AccountEmailVerificationRequiredError();
  }

  return {
    id: user.id,
    email: user.email,
    accountSessionId: user.accountSessionId,
  };
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class AccountEmailVerificationRequiredError extends Error {
  constructor(message = "Email verification is required before continuing.") {
    super(message);
    this.name = "AccountEmailVerificationRequiredError";
  }
}
