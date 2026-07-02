import { TwoFactorLoginForm, type TwoFactorLoginFormProps } from "./two-factor-login-form.js";

export type OAuthTwoFactorFormProps = Omit<TwoFactorLoginFormProps, "mode">;

/** Native HTML POST form for OAuth 2FA — compatible with password-manager auto-submit. */
export function OAuthTwoFactorForm(props: OAuthTwoFactorFormProps) {
  return <TwoFactorLoginForm mode="oauth" {...props} />;
}
