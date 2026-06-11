import { handleCredentialsLoginFormPost } from "@/modules/auth/lib/credentials-login-start-handler";

export async function POST(request: Request) {
  return handleCredentialsLoginFormPost(request);
}
