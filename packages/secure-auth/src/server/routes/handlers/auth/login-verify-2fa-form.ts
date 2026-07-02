import { handleTwoFactorFormPost } from "@/modules/auth/lib/two-factor-form-handler";
import type { SecureAuthServices } from "@/core/types";

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => handleTwoFactorFormPost(request, services);
}
