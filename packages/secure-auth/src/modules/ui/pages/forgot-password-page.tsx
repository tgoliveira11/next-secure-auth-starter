"use client";

import { useState } from "react";
import Link from "next/link";
import { PageShell } from "../layouts/page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { Alert } from "../primitives/alert.js";
import { Button } from "../primitives/button.js";
import { Input } from "../primitives/input.js";
import { FormField } from "../primitives/form-field.js";
import { GENERIC_FORGOT_PASSWORD_MESSAGE, accountAuthApi } from "@tgoliveira/secure-auth/client";
import { resolveAuthPaths, type ForgotPasswordPageProps } from "./types.js";

export function ForgotPasswordPage({
  title = "Forgot your password?",
  description = "Enter your email and we'll send reset instructions if an account exists.",
  brand,
  header,
  footer,
  className,
  width = "narrow",
  paths,
  submitLabel = "Send reset instructions",
  successMessage = GENERIC_FORGOT_PASSWORD_MESSAGE,
}: ForgotPasswordPageProps) {
  const resolved = resolveAuthPaths(paths);
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
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />
      <Card className="space-y-4">
        {submitted ? (
          <Alert variant="muted">{successMessage}</Alert>
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
              {loading ? "Sending…" : submitLabel}
            </Button>
          </form>
        )}
        {footer ?? (
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href={resolved.login} className="font-medium text-[var(--primary)] hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </Card>
    </PageShell>
  );
}
