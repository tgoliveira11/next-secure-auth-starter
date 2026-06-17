"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import { OAuthSignInError } from "./oauth-sign-in-error.js";
import { LoginCredentialsError } from "./login-credentials-error.js";
import { TurnstileCaptcha } from "./turnstile-captcha.js";
import { useCaptchaForPage } from "../../pages/use-page-ui.js";
import { cn } from "@tgoliveira/secure-auth/client";

const submitButtonClassName = cn(
  "min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export type CredentialsLoginFormProps = {
  loginAction?: string;
  forgotPasswordPath?: string;
  submitLabel?: string;
};

export function CredentialsLoginForm({
  loginAction = "/login",
  forgotPasswordPath = "/forgot-password",
  submitLabel = "Sign in with email",
}: CredentialsLoginFormProps) {
  const captcha = useCaptchaForPage("login");

  return (
    <form
      id="login-credentials-form"
      action={loginAction}
      method="post"
      className="space-y-4"
      autoComplete="on"
    >
      <FormField id="login-email" label="Email">
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </FormField>
      <FormField id="login-password" label="Password">
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <p className="text-right text-sm">
        <Link href={forgotPasswordPath} className="font-medium text-[var(--primary)] hover:underline">
          Forgot password?
        </Link>
      </p>
      <Suspense fallback={null}>
        <OAuthSignInError />
        <LoginCredentialsError />
      </Suspense>
      {captcha.required && <TurnstileCaptcha siteKey={captcha.siteKey} />}
      <button type="submit" className={submitButtonClassName}>
        {submitLabel}
      </button>
    </form>
  );
}
