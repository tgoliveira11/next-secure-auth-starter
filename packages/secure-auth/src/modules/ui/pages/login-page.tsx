"use client";

import Link from "next/link";
import { AuthPageShell } from "../layouts/auth-page-shell.js";
import { Card } from "../primitives/card.js";
import { PageHeader } from "../primitives/page-header.js";
import { CredentialsLoginForm } from "../features/auth/credentials-login-form.js";
import { LoginPasskeySection } from "../features/auth/login-passkey-section.js";
import { MagicLinkSignInSection } from "../features/auth/magic-link-sign-in-section.js";
import { TwoStepLoginPanel } from "../features/auth/two-step-login-panel.js";
import { type LoginPageProps } from "./types.js";
import {
  usePageTitle,
  useTwoStepLogin,
  useUiAppSlug,
  useUiMessage,
  useUiPaths,
} from "./use-page-ui.js";
import { GuestOnlyPageGuard } from "../auth-redirect/guest-only-page-guard.js";

export function LoginPage({
  brand,
  header,
  footer,
  className,
  width = "narrow",
  paths,
  appSlug: appSlugProp,
  title: titleProp,
  subtitle,
  description: descriptionProp,
  registerLinkLabel: registerLinkLabelProp,
  forgotPasswordLinkLabel,
  submitLabel,
  continueLabel,
  twoStep: twoStepProp,
  afterLoginPath,
  redirectIfAuthenticated,
  authenticatedRedirectPath,
  passkeyLoginHooks,
}: LoginPageProps) {
  const resolved = useUiPaths(paths);
  const twoStep = useTwoStepLogin(twoStepProp);
  const destination = afterLoginPath ?? resolved.afterLogin;
  const title = usePageTitle({ title: titleProp, subtitle }, "loginTitle", "Welcome back");
  const description = useUiMessage(
    descriptionProp,
    "loginDescription",
    "Sign in to your account."
  );
  const appSlug = useUiAppSlug(appSlugProp);
  const registerLinkLabel = useUiMessage(registerLinkLabelProp, "registerLinkLabel", "Create one");

  return (
    <GuestOnlyPageGuard
      redirectIfAuthenticated={redirectIfAuthenticated}
      authenticatedRedirectPath={authenticatedRedirectPath ?? destination}
      loadingLabel="Loading sign in"
    >
      <AuthPageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />
      <Card className="space-y-6">
        {twoStep ? (
          <TwoStepLoginPanel
            appSlug={appSlug}
            loginAction={resolved.login}
            forgotPasswordPath={resolved.forgotPassword}
            forgotPasswordLinkLabel={forgotPasswordLinkLabel}
            submitLabel={submitLabel}
            continueLabel={continueLabel}
            afterLoginPath={destination}
            loginTwoFactorPath={`${resolved.loginTwoFactor}?mode=credentials`}
            passkeyLoginHooks={passkeyLoginHooks}
          />
        ) : (
          <>
            <CredentialsLoginForm
              loginAction={resolved.login}
              forgotPasswordPath={resolved.forgotPassword}
              forgotPasswordLinkLabel={forgotPasswordLinkLabel}
              submitLabel={submitLabel}
            />
            <MagicLinkSignInSection />
            <LoginPasskeySection
              appSlug={appSlug}
              afterLoginPath={destination}
              loginPath={resolved.login}
              loginTwoFactorPath={`${resolved.loginTwoFactor}?mode=credentials`}
              hooks={passkeyLoginHooks}
            />
          </>
        )}
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
    </GuestOnlyPageGuard>
  );
}
