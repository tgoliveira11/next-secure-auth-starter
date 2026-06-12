"use client";

import { useState } from "react";
import { Button } from "../../primitives/button.js";
import { Alert } from "../../primitives/alert.js";
import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import { PasswordStrengthField } from "../auth/password-strength-field.js";
import { ACCOUNT_PASSWORD_RESET_NOTE, accountAuthApi } from "@tgoliveira/secure-auth/client";

export type ChangePasswordSettingsProps = {
  canChangePassword: boolean;
  authProvider: string;
};

export function ChangePasswordSettings({
  canChangePassword,
  authProvider,
}: ChangePasswordSettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canChangePassword) {
    return (
      <p className="text-sm text-[var(--muted)]">
        {authProvider === "credentials"
          ? "Password change is not available for this account."
          : "This account signs in with Google, Apple, or Microsoft. Password change is not available unless you add an email/password sign-in method."}
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
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
      <PasswordStrengthField
        id="new-password"
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        confirmValue={confirmPassword}
      />
      <PasswordStrengthField
        id="confirm-new-password"
        label="Confirm new password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        confirmValue={newPassword}
        showStrength={false}
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
