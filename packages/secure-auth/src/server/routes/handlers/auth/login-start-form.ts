import { handleCredentialsLoginFormPost } from "@/modules/auth/lib/credentials-login-start-handler";
import type { SecureAuthServices } from "@/core/types";

export function createPostHandler(services: SecureAuthServices) {
  return (request: Request) => handleCredentialsLoginFormPost(request, services);
}
