"use client";

import { Suspense } from "react";
import { OAuthSignInError } from "./oauth-sign-in-error.js";
import { LoginCredentialsError } from "./login-credentials-error.js";
import { TurnstileCaptcha } from "./turnstile-captcha.js";
import { useCaptchaForPage } from "../../pages/use-page-ui.js";
import {
  ForgotPasswordLink,
  LOGIN_FORM_ID,
  LoginEmailField,
  LoginPasswordField,
  loginSubmitButtonClassName,
} from "./login-form-fields.js";

export type CredentialsLoginFormProps = {
  loginAction?: string;
  forgotPasswordPath?: string;
  forgotPasswordLinkLabel?: string;
  submitLabel?: string;
};

export function CredentialsLoginForm({
  loginAction = "/login",
  forgotPasswordPath = "/forgot-password",
  forgotPasswordLinkLabel,
  submitLabel = "Sign in with email",
}: CredentialsLoginFormProps) {
  const captcha = useCaptchaForPage("login");

  return (
    <form
      id={LOGIN_FORM_ID}
      action={loginAction}
      method="post"
      className="space-y-4"
      autoComplete="on"
    >
      <LoginEmailField />
      <LoginPasswordField />
      <ForgotPasswordLink href={forgotPasswordPath} label={forgotPasswordLinkLabel} />
      <Suspense fallback={null}>
        <OAuthSignInError />
        <LoginCredentialsError />
      </Suspense>
      {captcha.required && <TurnstileCaptcha siteKey={captcha.siteKey} />}
      <button type="submit" className={loginSubmitButtonClassName}>
        {submitLabel}
      </button>
    </form>
  );
}
