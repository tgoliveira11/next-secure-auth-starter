"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import {
  passkeyAccountApi,
  prepareRegistrationOptions,
  setPasskeyLoginHint,
  type AccountPasskey,
} from "@tgoliveira/secure-auth/client";
import { Card, CardDescription, CardHeader, CardTitle } from "../../primitives/card.js";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { ConfirmDialog } from "../../primitives/confirm-dialog.js";
import { LoadingState } from "../../primitives/loading-state.js";
import { SuccessState } from "../../primitives/success-state.js";

export type PasskeySettingsProps = {
  userId: string;
  appSlug: string;
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isUserCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "NotAllowedError";
}

export function PasskeySettings({ userId, appSlug }: PasskeySettingsProps) {
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
      const options =
        (await passkeyAccountApi.registerOptions()) as PublicKeyCredentialCreationOptionsJSON;
      const attestation = await startRegistration({
        optionsJSON: prepareRegistrationOptions(options),
      });

      const result = await passkeyAccountApi.registerVerify({
        response: attestation,
      });

      if (result.verified) {
        setPasskeyLoginHint(appSlug, { userId, credentialId: result.credentialId });
        setSuccess("Passkey added for sign-in.");
        await loadPasskeys();
      }
    } catch (e) {
      if (isUserCancellation(e)) {
        setError("Passkey registration was cancelled.");
      } else {
        setError(e instanceof Error ? e.message : "Passkey registration failed");
      }
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

  if (loading) {
    return <LoadingState label="Loading passkeys" />;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Sign in without a password using a passkey stored on this device or synced account.
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
                <div>
                  <p className="font-medium">{passkey.friendlyName}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Added {formatDate(passkey.createdAt)} · Last used{" "}
                    {formatDate(passkey.lastUsedAt)}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setRemoveTarget(passkey)}>
                  Remove
                </Button>
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
            ? `Remove "${removeTarget.friendlyName}" from your account? You can add it again later.`
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
