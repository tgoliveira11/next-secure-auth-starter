"use client";

import { useState } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@tgoliveira/secure-auth/react";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { Alert } from "@tgoliveira/secure-auth/react";
import { Button } from "@tgoliveira/secure-auth/react";
import { Input } from "@tgoliveira/secure-auth/react";
import { FormField } from "@tgoliveira/secure-auth/react";
import { GENERIC_FORGOT_PASSWORD_MESSAGE } from "@tgoliveira/secure-auth/client";
import { accountAuthApi } from "@tgoliveira/secure-auth/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await accountAuthApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout width="narrow">
      <PageHeader
        title="Forgot your password?"
        description="Enter your email and we'll send reset instructions if an account exists."
      />
      <Card className="space-y-4">
        {submitted ? (
          <Alert variant="muted">{GENERIC_FORGOT_PASSWORD_MESSAGE}</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField id="forgot-email" label="Email">
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            {error && (
              <p className="text-sm text-[var(--danger)]" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send reset instructions"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </Card>
    </PageLayout>
  );
}
