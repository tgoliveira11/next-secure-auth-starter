import { getPasswordPolicyConfig } from "@tgoliveira/secure-auth/client/password-policy";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm passwordPolicy={getPasswordPolicyConfig()} />;
}
