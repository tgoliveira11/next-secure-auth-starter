import "server-only";
import type { SecureAuthServices } from "@/core/types";
import { getPendingTwoFactorLoginEmail as resolvePendingTwoFactorLoginEmail } from "../modules/auth/lib/pending-two-factor-login-email.js";

/** Server Component helper: email for password-manager username association on `/login/2fa`. */
export async function getPendingTwoFactorLoginEmail(
  getServices: () => Promise<SecureAuthServices>
): Promise<string | undefined> {
  const services = await getServices();
  return resolvePendingTwoFactorLoginEmail(services);
}
