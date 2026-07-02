"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthPageShell } from "../layouts/auth-page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { Card } from "../primitives/card.js";
import { Alert } from "../primitives/alert.js";
import { CredentialsTwoFactorForm } from "../features/auth/credentials-two-factor-form.js";
import { OAuthTwoFactorForm } from "../features/auth/oauth-two-factor-form.js";
import { useTwoFactorUsernameEmail } from "../features/auth/use-two-factor-username-email.js";
import { type LoginTwoFactorPageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";
import { useLoginTwoFactorPageGuard } from "../auth-redirect/use-flow-page-guards.js";
import { LoadingState } from "../primitives/loading-state.js";

function LoginTwoFactorContent({
  mode: modeProp,
  errorCode: errorCodeProp,
  brand,
  header,
  className,
  width = "narrow",
  paths,
  afterLoginPath,
  title: titleProp,
  subtitle,
  description: descriptionProp,
  authenticatedRedirectPath,
  redirectIfAuthenticated,
}: LoginTwoFactorPageProps) {
  const searchParams = useSearchParams();
  const resolved = useUiPaths(paths);
  const mode = modeProp ?? (searchParams.get("mode") === "credentials" ? "credentials" : "oauth");
  const errorCode = errorCodeProp ?? searchParams.get("error") ?? undefined;
  const destination = afterLoginPath ?? resolved.afterLogin;
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "loginTwoFactorTitle",
    "Two-factor authentication"
  );
  const description = useUiMessage(
    descriptionProp,
    "loginTwoFactorDescription",
    "Enter the 6-digit code from your authenticator app to finish signing in."
  );

  const guard = useLoginTwoFactorPageGuard({
    mode,
    loginPath: resolved.login,
    redirectIfAuthenticated,
    authenticatedRedirectPath: authenticatedRedirectPath ?? destination,
  });
  const usernameEmail = useTwoFactorUsernameEmail(mode);

  if (guard.isLoading) {
    return (
      <AuthPageShell width={width} className={className}>
        <LoadingState label="Loading two-factor sign in" />
      </AuthPageShell>
    );
  }

  if (!guard.shouldRender) {
    return null;
  }

  return (
    <AuthPageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />

      <Card className="space-y-4">
        <Alert variant="info">
          Enter the one-time code from your authenticator app to finish signing in. When two-factor
          authentication is enabled, it is required after password, passkey, and OAuth sign-in.
        </Alert>

        {mode === "credentials" ? (
          <CredentialsTwoFactorForm
            errorCode={errorCode}
            formAction={resolved.loginTwoFactor}
            loginPath={resolved.login}
            usernameEmail={usernameEmail}
          />
        ) : (
          <Suspense fallback={null}>
            <OAuthTwoFactorForm
              formAction={resolved.loginTwoFactor}
              loginPath={resolved.login}
              usernameEmail={usernameEmail}
              errorCode={errorCode}
            />
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
