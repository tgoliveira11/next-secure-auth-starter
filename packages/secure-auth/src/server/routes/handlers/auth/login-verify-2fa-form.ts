import { handleCredentialsTwoFactorFormPost } from "@/modules/auth/lib/credentials-two-factor-form-handler";
import type { SecureAuthServices } from "@/core/types";

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => handleCredentialsTwoFactorFormPost(request, services);
}
