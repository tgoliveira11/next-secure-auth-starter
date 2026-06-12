"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { Button } from "../primitives/button.js";
import { Input } from "../primitives/input.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../primitives/card.js";
import { Alert } from "../primitives/alert.js";
import { FormField } from "../primitives/form-field.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import {
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  accountApi,
  accountAuthApi,
  formatAuthProvider,
  type AccountAuthStatus,
} from "@tgoliveira/secure-auth/client";
import { defaultSignOutAccount } from "@tgoliveira/secure-auth/react/client";
import { EmailVerificationSettings } from "../features/settings/email-verification-settings.js";
import { ChangePasswordSettings } from "../features/settings/change-password-settings.js";
import { resolveAuthPaths, type AccountSettingsPageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";

export function AccountSettingsPage({
  brand,
  header,
  className,
  width = "medium",
  paths,
  onSignOut = defaultSignOutAccount,
  afterDeletePath,
  deleteSubmitLabel = "Delete my account permanently",
  title: titleProp,
  subtitle,
  description: descriptionProp,
}: AccountSettingsPageProps) {
  const resolved = useUiPaths(paths);
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "accountSettingsTitle",
    "Account settings"
  );
  const description = useUiMessage(
    descriptionProp,
    "accountSettingsDescription",
    "Manage your email, password, verification, and account lifecycle."
  );
  const deleteDestination = afterDeletePath ?? resolved.accountDeleted;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [authProvider, setAuthProvider] = useState<string>("credentials");
  const [authStatus, setAuthStatus] = useState<AccountAuthStatus | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(resolved.login);
      return;
    }
    if (status !== "authenticated") return;

    let cancelled = false;

    (async () => {
      try {
        const [requirements, accountAuthStatus] = await Promise.all([
          accountApi.getDeletionRequirements(),
          accountAuthApi.getStatus().catch(() => null),
        ]);
        if (cancelled) return;
        setRequiresPassword(requirements.requiresPassword);
        setAuthProvider(requirements.authProvider);
        setAuthStatus(accountAuthStatus);
      } catch {
        if (!cancelled) setError("Could not load account settings.");
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router, resolved.login]);

  const phraseMatches = confirmationPhrase === ACCOUNT_DELETION_CONFIRMATION_PHRASE;
  const passwordReady = !requiresPassword || password.length > 0;
  const canDelete = phraseMatches && passwordReady && !loading;

  async function handleDeleteAccount() {
    if (!session?.user?.id || !canDelete) return;

    setLoading(true);
    setError(null);

    try {
      await accountApi.deleteAccount({
        confirmationPhrase,
        password: requiresPassword ? password : undefined,
      });

      await onSignOut();
      router.push(deleteDestination);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account deletion failed");
      setLoading(false);
    }
  }

  if (status === "loading" || overviewLoading) {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Loading account settings" />
      </PageShell>
    );
  }

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Basic account details.</CardDescription>
        </CardHeader>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-medium text-[var(--muted)]">Email</dt>
            <dd>{session?.user?.email ?? "Not available"}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--muted)]">Sign-in method</dt>
            <dd>{formatAuthProvider(authProvider)}</dd>
          </div>
        </dl>
      </Card>

      {authStatus?.hasPassword && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Email verification</CardTitle>
            <CardDescription>Confirm your email address for this account.</CardDescription>
          </CardHeader>
          <EmailVerificationSettings
            email={authStatus.email}
            emailVerified={authStatus.emailVerified}
            onStatusChange={() => {
              void accountAuthApi.getStatus().then(setAuthStatus).catch(() => undefined);
            }}
          />
        </Card>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update the password you use to sign in with email.</CardDescription>
        </CardHeader>
        <ChangePasswordSettings
          canChangePassword={authStatus?.canChangePassword ?? false}
          authProvider={authStatus?.authProvider ?? authProvider}
        />
      </Card>

      <Card className="border-[var(--danger-muted)]">
        <CardHeader>
          <CardTitle className="text-[var(--danger)]">Delete account</CardTitle>
          <CardDescription>
            This permanently removes your account, passkeys, sessions, and related account data from
            active storage. This cannot be undone.
          </CardDescription>
        </CardHeader>

        <div className="space-y-4">
          <Alert variant="warning">
            Account deletion is irreversible. Make sure you no longer need access to this account.
          </Alert>

          {requiresPassword ? (
            <FormField id="delete-password" label="Re-enter your password">
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Signed in with {formatAuthProvider(authProvider)}. Confirm deletion with the phrase
              below using your current session.
            </p>
          )}

          <FormField
            id="delete-phrase"
            label={`Type "${ACCOUNT_DELETION_CONFIRMATION_PHRASE}" to confirm`}
          >
            <Input
              id="delete-phrase"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>

          <Button
            variant="danger"
            className="w-full"
            disabled={!canDelete}
            onClick={handleDeleteAccount}
          >
            {loading ? "Deleting account…" : deleteSubmitLabel}
          </Button>

          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Card>
    </PageShell>
  );
}
