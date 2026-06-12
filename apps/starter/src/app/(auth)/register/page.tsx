import { RegisterPage } from "@tgoliveira/secure-auth/react";
import { getPasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";
import { APP_SLUG } from "@/lib/brand";

export default function Page() {
  return <RegisterPage passwordPolicy={getPasswordPolicyConfig()} appSlug={APP_SLUG} />;
}
