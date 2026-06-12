import "server-only";
import { getServerSession } from "next-auth";
import type { SecureAuthServices } from "@/core/types";

export async function getSessionUser(services: SecureAuthServices) {
  const session = await getServerSession(services.getAuthOptions());
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    accountSessionId: session.accountSessionId,
    twoFactorVerified: session.twoFactorVerified !== false,
    twoFactorPending: session.twoFactorPending === true,
  };
}

export async function requireSessionUser(services: SecureAuthServices) {
  const user = await getSessionUser(services);
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  return user;
}

export async function requireFullyAuthenticatedUser(services: SecureAuthServices) {
  const user = await requireSessionUser(services);
  if (!user.twoFactorVerified) {
    throw new UnauthorizedError("Two-factor verification required");
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
