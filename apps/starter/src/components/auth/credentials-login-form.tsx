"use client";

import Link from "next/link";
import { Suspense } from "react";
import { FormField } from "@tgoliveira/secure-auth/react";
import { Input } from "@tgoliveira/secure-auth/react";
import { OAuthSignInError } from "@/components/auth/oauth-sign-in-error";
import { LoginCredentialsError } from "@/components/auth/login-credentials-error";
import { cn } from "@tgoliveira/secure-auth/client";

const submitButtonClassName = cn(
  "min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function CredentialsLoginForm() {
  return (
    <form
      id="login-credentials-form"
      action="/login"
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
        <Link href="/forgot-password" className="font-medium text-[var(--primary)] hover:underline">
          Forgot password?
        </Link>
      </p>
      <Suspense fallback={null}>
        <OAuthSignInError />
        <LoginCredentialsError />
      </Suspense>
      <button type="submit" className={submitButtonClassName}>
        Sign in with email
      </button>
    </form>
  );
}
