"use client";

import { useCallback, useEffect, useState } from "react";
import {
  passkeyAccountApi,
  setPasskeyLoginHint,
  type AccountPasskey,
} from "@tgoliveira/secure-auth/client";
import {
  enableAccountPasskeySignIn,
  registerAccountPasskey,
  type AccountPasskeyRegistrationHooks,
} from "@tgoliveira/secure-auth/react/client";
import { Card, CardDescription, CardHeader, CardTitle } from "../../primitives/card.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { Badge } from "../../primitives/badge.js";
import { getPasskeyRegistrationErrorMessage } from "../../../passkeys/lib/passkey-registration-errors.js";
import { ConfirmDialog } from "../../primitives/confirm-dialog.js";
import { LoadingState } from "../../primitives/loading-state.js";
import { SuccessState } from "../../primitives/success-state.js";

export type PasskeySettingsProps = {
  userId: string;
  appSlug: string;
  /** Optional browser-only composition hooks for an additional passkey capability. */
  registrationHooks?: AccountPasskeyRegistrationHooks;
  /** Show vault-only to account-sign-in promotion. Default: false. */
  allowSignInCapabilityPromotion?: boolean;
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PasskeySettings({
  userId,
  appSlug,
  registrationHooks,
  allowSignInCapabilityPromotion = false,
}: PasskeySettingsProps) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<AccountPasskey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AccountPasskey | null>(null);

  const loadPasskeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await passkeyAccountApi.list();
      setPasskeys(result.passkeys);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load passkeys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  async function handleRegisterPasskey() {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await registerAccountPasskey({ hooks: registrationHooks });

      if (result.verified) {
        setPasskeyLoginHint(appSlug, { userId, credentialId: result.credentialId });
        setSuccess(
          result.integration.status === "failed"
            ? "Passkey added for sign-in. Additional passkey setup did not complete."
            : "Passkey added for sign-in."
        );
        await loadPasskeys();
      }
    } catch (e) {
      setError(getPasskeyRegistrationErrorMessage(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePasskey() {
    if (!removeTarget) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await passkeyAccountApi.remove(removeTarget.id);
      setSuccess("Passkey removed.");
      setRemoveTarget(null);
      await loadPasskeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove passkey");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnableSignIn(passkey: AccountPasskey) {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await enableAccountPasskeySignIn(passkey.id);
      setPasskeyLoginHint(appSlug, { userId, credentialId: result.credentialId });
      setSuccess("This passkey can now sign in to your account.");
      await loadPasskeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable passkey sign-in");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading passkeys" />;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Manage account sign-in passkeys. Other credentials (such as vault unlock) may appear for
          transparency but are managed from their own settings.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4">
        {passkeys.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No passkeys registered yet.</p>
        ) : (
          <ul className="space-y-3">
            {passkeys.map((passkey) => (
              <li
                key={passkey.id}
                className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{passkey.label}</p>
                    {passkey.badge && <Badge variant="muted">{passkey.badge}</Badge>}
                  </div>
                  <p className="text-sm text-[var(--muted)]">{passkey.description}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Added {formatDate(passkey.createdAt)} · Last used{" "}
                    {formatDate(passkey.lastUsedAt)}
                  </p>
                  {!passkey.removableFromAccountSettings && (
                    <p className="text-xs text-[var(--muted)]">
                      Remove this credential from the settings page for the feature that uses it.
                    </p>
                  )}
                </div>
                {passkey.removableFromAccountSettings ? (
                  <Button variant="secondary" onClick={() => setRemoveTarget(passkey)}>
                    Remove
                  </Button>
                ) : allowSignInCapabilityPromotion &&
                  !passkey.signInEnabled &&
                  passkey.vaultUnlockEnabled ? (
                  <Button
                    variant="secondary"
                    disabled={actionLoading}
                    onClick={() => void handleEnableSignIn(passkey)}
                  >
                    Enable sign-in
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Button onClick={handleRegisterPasskey} disabled={actionLoading}>
          {actionLoading ? "Working…" : "Add passkey"}
        </Button>

        {success && <SuccessState message={success} />}
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove passkey?"
        description={
          removeTarget
            ? `Remove "${removeTarget.label}" from your account? You can add it again later.`
            : ""
        }
        confirmLabel="Remove passkey"
        onConfirm={handleRemovePasskey}
        onCancel={() => setRemoveTarget(null)}
        loading={actionLoading}
      />
    </Card>
  );
}
