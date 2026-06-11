"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOutAccount } from "@/lib/auth/sign-out-client";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ACCOUNT_DELETION_CONFIRMATION_PHRASE } from "@/lib/account-deletion";
import { accountApi } from "@/lib/api-client/account";
import { formatAuthProvider } from "@/lib/ui/format-auth-provider";
import { EmailVerificationSettings } from "@/components/settings/email-verification-settings";
import { ChangePasswordSettings } from "@/components/settings/change-password-settings";
import { accountAuthApi, type AccountAuthStatus } from "@/lib/api-client/account-auth";

export default function AccountSettingsPage() {
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
      router.replace("/login");
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
  }, [status, router]);

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

      await signOutAccount();
      router.push("/account-deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account deletion failed");
      setLoading(false);
    }
  }

  if (status === "loading" || overviewLoading) {
    return (
      <PageLayout width="medium">
        <LoadingState label="Loading account settings" />
      </PageLayout>
    );
  }

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Account settings"
        description="Manage your email, password, verification, and account lifecycle."
      />

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
            {loading ? "Deleting account…" : "Delete my account permanently"}
          </Button>

          {error && (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          )}
        </div>
      </Card>
    </PageLayout>
  );
}
