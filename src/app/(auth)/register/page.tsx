import { getPasswordPolicyConfig } from "@/lib/password-policy";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm passwordPolicy={getPasswordPolicyConfig()} />;
}
