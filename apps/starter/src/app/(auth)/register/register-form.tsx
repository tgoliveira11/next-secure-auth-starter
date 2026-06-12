"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@tgoliveira/secure-auth/react";
import { Input } from "@tgoliveira/secure-auth/react";
import { Card } from "@tgoliveira/secure-auth/react";
import { FormField } from "@tgoliveira/secure-auth/react";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { SocialSignIn } from "@/components/auth/social-sign-in";
import { getErrorMessage } from "@tgoliveira/secure-auth/client";
import { PasswordStrengthField } from "@/components/auth/password-strength-field";
import { authLoginApi } from "@tgoliveira/secure-auth/client";
import { ApiError } from "@tgoliveira/secure-auth/client";
import {
  getPasswordPolicyHint,
  type PasswordPolicyConfig,
  validatePasswordForSubmission,
} from "@tgoliveira/secure-auth/client/password-policy";

type RegisterResponse = {
  id: string;
  email: string;
  requiresEmailVerification: boolean;
  requireEmailVerificationBeforeSignIn: boolean;
};

export function RegisterForm({ passwordPolicy }: { passwordPolicy: PasswordPolicyConfig }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (passwordPolicy.enforcement === "enforce") {
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
      router.push(`/check-email?email=${encodeURIComponent(email)}&required=1`);
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

      router.push("/dashboard");
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
    <PageLayout width="narrow">
      <PageHeader
        title="Create your account"
        description="Set up secure email/password sign-in for your account."
      />

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
            hint={getPasswordPolicyHint(passwordPolicy)}
          />
          {error && (
            <p className="text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account with email"}
          </Button>
        </form>

        <SocialSignIn dividerLabel="or sign up with" />

        <p className="text-center text-xs text-[var(--muted)]">
          Google, Apple, and Microsoft create your account automatically on first sign-in — the same
          providers available on the sign-in page.
        </p>
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </PageLayout>
  );
}
