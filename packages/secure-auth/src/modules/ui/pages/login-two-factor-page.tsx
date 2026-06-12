"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPageShell } from "../layouts/auth-page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { Card } from "../primitives/card.js";
import { Alert } from "../primitives/alert.js";
import { CredentialsTwoFactorForm } from "../features/auth/credentials-two-factor-form.js";
import { OAuthTwoFactorForm } from "../features/auth/oauth-two-factor-form.js";
import { resolveAuthPaths, type LoginTwoFactorPageProps } from "./types.js";

function LoginTwoFactorContent({
  mode: modeProp,
  errorCode: errorCodeProp,
  title = "Two-factor authentication",
  description = "Enter the 6-digit code from your authenticator app to finish signing in.",
  brand,
  header,
  className,
  width = "narrow",
  paths,
  afterLoginPath,
}: LoginTwoFactorPageProps) {
  const searchParams = useSearchParams();
  const resolved = resolveAuthPaths(paths);
  const mode = modeProp ?? (searchParams.get("mode") === "credentials" ? "credentials" : "oauth");
  const errorCode = errorCodeProp ?? searchParams.get("error") ?? undefined;
  const destination = afterLoginPath ?? resolved.afterLogin;

  return (
    <AuthPageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />

      <Card className="space-y-4">
        <Alert variant="info">
          This code protects your account sign-in only. It does not replace passkey sign-in or
          OAuth provider verification.
        </Alert>

        {mode === "credentials" ? (
          <CredentialsTwoFactorForm
            errorCode={errorCode}
            formAction={resolved.loginTwoFactor}
            loginPath={resolved.login}
          />
        ) : (
          <Suspense fallback={null}>
            <OAuthTwoFactorForm afterLoginPath={destination} />
          </Suspense>
        )}
      </Card>
    </AuthPageShell>
  );
}

export function LoginTwoFactorPage(props: LoginTwoFactorPageProps) {
  return (
    <Suspense fallback={null}>
      <LoginTwoFactorContent {...props} />
    </Suspense>
  );
}
