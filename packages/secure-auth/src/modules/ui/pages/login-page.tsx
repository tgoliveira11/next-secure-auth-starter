"use client";

import Link from "next/link";
import { AuthPageShell } from "../layouts/auth-page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { CredentialsLoginForm } from "../features/auth/credentials-login-form.js";
import { LoginPasskeySection } from "../features/auth/login-passkey-section.js";
import { resolveAuthPaths, type LoginPageProps } from "./types.js";

export function LoginPage({
  title = "Welcome back",
  description = "Sign in to your account.",
  brand,
  header,
  footer,
  className,
  width = "narrow",
  paths,
  appSlug = "app",
  registerLinkLabel = "Create one",
  forgotPasswordLinkLabel,
  submitLabel,
  afterLoginPath,
}: LoginPageProps) {
  const resolved = resolveAuthPaths(paths);
  const destination = afterLoginPath ?? resolved.afterLogin;

  return (
    <AuthPageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />
      <Card className="space-y-6">
        <CredentialsLoginForm
          loginAction={resolved.login}
          forgotPasswordPath={resolved.forgotPassword}
          submitLabel={submitLabel}
        />
        <LoginPasskeySection
          appSlug={appSlug}
          afterLoginPath={destination}
          loginPath={resolved.login}
        />
      </Card>
      {footer ?? (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          No account?{" "}
          <Link href={resolved.register} className="font-medium text-[var(--primary)] hover:underline">
            {registerLinkLabel}
          </Link>
        </p>
      )}
    </AuthPageShell>
  );
}
