"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Input } from "../primitives/input.js";
import { Card } from "../primitives/card.js";
import { FormField } from "../primitives/form-field.js";
import { PageHeader } from "../primitives/page-header.js";
import { SocialSignIn } from "../features/auth/social-sign-in.js";
import { PasswordStrengthField } from "../features/auth/password-strength-field.js";
import {
  ApiError,
  authLoginApi,
  getErrorMessage,
} from "@tgoliveira/secure-auth/client";
import {
  getPasswordPolicyHint,
  validatePasswordForSubmission,
} from "@tgoliveira/secure-auth/client/password-policy";
import { type RegisterPageProps } from "./types.js";
import {
  usePageTitle,
  useUiMessage,
  useUiPasswordPolicy,
  useUiPaths,
} from "./use-page-ui.js";

type RegisterResponse = {
  id: string;
  email: string;
  requiresEmailVerification: boolean;
  requireEmailVerificationBeforeSignIn: boolean;
};

export function RegisterPage({
  brand,
  header,
  footer,
  className,
  width = "narrow",
  paths,
  passwordPolicy: passwordPolicyProp,
  submitLabel = "Create account with email",
  loginLinkLabel: loginLinkLabelProp,
  afterLoginPath,
  title: titleProp,
  subtitle,
  description: descriptionProp,
  passwordStrengthPosition,
}: RegisterPageProps) {
  const resolved = useUiPaths(paths);
  const destination = afterLoginPath ?? resolved.afterLogin;
  const passwordPolicy = useUiPasswordPolicy(passwordPolicyProp);
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "registerTitle",
    "Create your account"
  );
  const description = useUiMessage(
    descriptionProp,
    "registerDescription",
    "Set up secure email/password sign-in for your account."
  );
  const loginLinkLabel = useUiMessage(loginLinkLabelProp, "loginLinkLabel", "Sign in");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (passwordPolicy?.enforcement === "enforce") {
      const policyResult = validatePasswordForSubmission(password, passwordPolicy);
      if (!policyResult.valid) {
        setError(
          policyResult.assessment.messages[0] ?? "Password does not meet the configured policy."
        );
        setLoading(false);
        return;
      }
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError(await getErrorMessage(res, "Registration failed"));
      setLoading(false);
      return;
    }

    const body = (await res.json()) as RegisterResponse;

    if (body.requireEmailVerificationBeforeSignIn) {
      setLoading(false);
      router.push(
        `${resolved.checkEmail}?email=${encodeURIComponent(email)}&required=1`
      );
      return;
    }

    try {
      const start = await authLoginApi.start({ email, password });
      if (start.requiresTwoFactor) {
        setError("Two-factor authentication is enabled. Sign in from the login page.");
        setLoading(false);
        return;
      }

      const result = await signIn("login-token", {
        loginToken: start.loginToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created, but sign-in could not complete. Try signing in.");
        setLoading(false);
        return;
      }

      router.push(destination);
    } catch (signInError) {
      if (signInError instanceof ApiError) {
        setError(signInError.message);
      } else {
        setError("Account created, but sign-in could not complete. Try signing in.");
      }
      setLoading(false);
    }
  }

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />

      <Card className="space-y-6">
        <form onSubmit={handleRegister} className="space-y-4">
          <FormField id="register-email" label="Email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <PasswordStrengthField
            id="register-password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            policyConfig={passwordPolicy}
            hint={passwordPolicy ? getPasswordPolicyHint(passwordPolicy) : undefined}
            passwordStrengthPosition={passwordStrengthPosition}
          />
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : submitLabel}
          </Button>
        </form>

        <SocialSignIn dividerLabel="or sign up with" afterLoginPath={destination} />

        <p className="text-center text-xs text-[var(--muted)]">
          Google, Apple, and Microsoft create your account automatically on first sign-in — the same
          providers available on the sign-in page.
        </p>
      </Card>

      {footer ?? (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href={resolved.login} className="font-medium text-[var(--primary)] hover:underline">
            {loginLinkLabel}
          </Link>
        </p>
      )}
    </PageShell>
  );
}
