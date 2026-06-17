"use client";

import { useState } from "react";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import { PasswordSetupFields } from "../password/password-setup-fields.js";
import { ACCOUNT_PASSWORD_RESET_NOTE, accountAuthApi } from "@tgoliveira/secure-auth/client";
import { validatePasswordSetup } from "@tgoliveira/secure-auth/client/password-policy";

import type { PasswordStrengthFeedbackPosition } from "../../../../core/ui-config.js";
import { useEffectivePasswordPolicy } from "../../pages/use-page-ui.js";

export type ChangePasswordSettingsProps = {
  canChangePassword: boolean;
  authProvider: string;
  /** Override global password strength/validation feedback placement. */
  passwordStrengthPosition?: PasswordStrengthFeedbackPosition;
};

export function ChangePasswordSettings({
  canChangePassword,
  authProvider,
  passwordStrengthPosition,
}: ChangePasswordSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const passwordPolicy = useEffectivePasswordPolicy();

  if (!canChangePassword) {
    return (
      <p className="text-sm text-[var(--muted)]">
        {authProvider === "credentials"
          ? "Password change is not available for this account."
          : "This account signs in with Google, Apple, GitHub, or Microsoft. Password change is not available unless you add an email/password sign-in method."}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordPolicy.enforcement === "enforce") {
      const setup = validatePasswordSetup({
        password: newPassword,
        confirmation: confirmPassword,
        policy: passwordPolicy,
      });
      if (!setup.valid) {
        setError(
          setup.password.messages[0] ??
            setup.confirmation.message ??
            "Password does not meet the configured policy."
        );
        return;
      }
    } else if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await accountAuthApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Your password has been updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert variant="muted">{ACCOUNT_PASSWORD_RESET_NOTE}</Alert>
      <FormField id="current-password" label="Current password">
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </FormField>
      <PasswordSetupFields
        passwordId="new-password"
        confirmId="confirm-new-password"
        passwordLabel="New password"
        confirmLabel="Confirm new password"
        value={newPassword}
        confirmValue={confirmPassword}
        onChange={setNewPassword}
        onConfirmChange={setConfirmPassword}
        policy={passwordPolicy}
        feedbackPosition={passwordStrengthPosition}
      />
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      {success && <Alert variant="success">{success}</Alert>}
      <Button type="submit" disabled={loading}>
        {loading ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
