import { handleCredentialsTwoFactorFormPost } from "@/modules/auth/lib/credentials-two-factor-form-handler";

export async function POST(request: Request) {
  return handleCredentialsTwoFactorFormPost(request);
}