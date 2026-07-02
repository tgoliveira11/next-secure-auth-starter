import { TwoFactorLoginForm, type TwoFactorLoginFormProps } from "./two-factor-login-form.js";

export type CredentialsTwoFactorFormProps = Omit<TwoFactorLoginFormProps, "mode">;

export function CredentialsTwoFactorForm(props: CredentialsTwoFactorFormProps) {
  return <TwoFactorLoginForm mode="credentials" {...props} />;
}
