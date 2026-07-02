import "server-only";
import { cookies } from "next/headers";
import type { SecureAuthServices } from "@/core/types";

export type PendingTwoFactorLoginState = {
  pending: boolean;
  email?: string;
};

/** Resolve pending credentials 2FA challenge state from the httpOnly challenge cookie. */
export async function getPendingTwoFactorLoginState(
  services: SecureAuthServices
): Promise<PendingTwoFactorLoginState> {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(services.ctx.getTwoFactorLoginChallengeCookieName())?.value;
  if (typeof challengeToken !== "string" || challengeToken.length < 16) {
    return { pending: false };
  }

  const challenge = await services.repos.twoFactorRepository.peekLoginChallenge(
    services.ctx.hashOpaqueToken(challengeToken)
  );
  if (!challenge) {
    return { pending: false };
  }

  const user = await services.repos.userRepository.findById(challenge.userId);
  const email = user?.email ?? undefined;
  return email !== undefined ? { pending: true, email } : { pending: true };
}

/** Resolve the signing-in email for a pending credentials 2FA challenge (httpOnly cookie). */
export async function getPendingTwoFactorLoginEmail(
  services: SecureAuthServices
): Promise<string | undefined> {
  const state = await getPendingTwoFactorLoginState(services);
  return state.email;
}
