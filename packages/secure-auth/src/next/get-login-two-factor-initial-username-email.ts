import "server-only";
import type { SecureAuthServices } from "@/core/types";
import { getPendingTwoFactorLoginEmail } from "../modules/auth/lib/pending-two-factor-login-email.js";
import { getSessionUser } from "../modules/auth/lib/session.js";

/** Server Component helper: email for password-manager username association on `/login/2fa`. */
export async function getLoginTwoFactorInitialUsernameEmail(
  getServices: () => Promise<SecureAuthServices>
): Promise<string | undefined> {
  const services = await getServices();
  const credentialsEmail = await getPendingTwoFactorLoginEmail(services);
  if (credentialsEmail) {
    return credentialsEmail;
  }

  const sessionUser = await getSessionUser(services);
  if (
    sessionUser?.twoFactorPending &&
    !sessionUser.twoFactorVerified &&
    sessionUser.email.length > 0
  ) {
    return sessionUser.email;
  }

  return undefined;
}
