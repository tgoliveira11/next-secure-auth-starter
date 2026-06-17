"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { FormField, fieldDescribedBy } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import {
  validatePasswordSetup,
  type PasswordPolicyConfig,
  type PasswordSetupValidationResult,
  type PasswordStrengthPosition,
} from "@tgoliveira/secure-auth/client/password-policy";
import { PasswordStrengthField } from "./password-strength-field.js";
import { useControllableString } from "./use-controllable-string.js";
import { cn } from "../../lib/cn.js";

export type PasswordSetupFieldsProps = {
  passwordId?: string;
  confirmId?: string;
  passwordName?: string;
  confirmName?: string;
  passwordLabel?: ReactNode;
  confirmLabel?: ReactNode;
  value?: string;
  confirmValue?: string;
  defaultValue?: string;
  defaultConfirmValue?: string;
  onChange?: (value: string) => void;
  onConfirmChange?: (value: string) => void;
  policy?: Partial<PasswordPolicyConfig>;
  feedbackPosition?: PasswordStrengthPosition;
  requireConfirmation?: boolean;
  confirmPlaceholder?: string;
  passwordPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  passwordInputClassName?: string;
  confirmInputClassName?: string;
  feedbackClassName?: string;
  description?: ReactNode;
  confirmationMismatchMessage?: string;
  onValidityChange?: (valid: boolean, result: PasswordSetupValidationResult) => void;
};

export function PasswordSetupFields({
  passwordId = "password",
  confirmId = "confirm-password",
  passwordName,
  confirmName,
  passwordLabel = "Password",
  confirmLabel = "Confirm password",
  value,
  confirmValue,
  defaultValue,
  defaultConfirmValue,
  onChange,
  onConfirmChange,
  policy,
  feedbackPosition = "above",
  requireConfirmation = true,
  confirmPlaceholder,
  passwordPlaceholder,
  disabled = false,
  required = true,
  className,
  passwordInputClassName,
  confirmInputClassName,
  feedbackClassName,
  description,
  confirmationMismatchMessage,
  onValidityChange,
}: PasswordSetupFieldsProps) {
  const [password, setPassword] = useControllableString(value, defaultValue, onChange);
  const [confirmation, setConfirmation] = useControllableString(
    confirmValue,
    defaultConfirmValue,
    onConfirmChange
  );

  const setupValidation = useMemo(
    () =>
      validatePasswordSetup({
        password,
        confirmation,
        policy,
        requireConfirmation,
        confirmationMismatchMessage,
      }),
    [password, confirmation, policy, requireConfirmation, confirmationMismatchMessage]
  );

  useEffect(() => {
    onValidityChange?.(setupValidation.valid, setupValidation);
  }, [onValidityChange, setupValidation]);

  const confirmMismatchId = `${confirmId}-mismatch`;
  const confirmDescribedBy = setupValidation.confirmation.matches
    ? undefined
    : fieldDescribedBy(confirmId, confirmMismatchId);

  return (
    <div className={cn("space-y-4", className)}>
      <PasswordStrengthField
        id={passwordId}
        name={passwordName}
        label={passwordLabel}
        value={password}
        onChange={setPassword}
        policy={policy}
        feedbackPosition={feedbackPosition}
        placeholder={passwordPlaceholder}
        autoComplete="new-password"
        disabled={disabled}
        required={required}
        inputClassName={passwordInputClassName}
        feedbackClassName={feedbackClassName}
        description={description}
      />

      {requireConfirmation && (
        <FormField id={confirmId} label={confirmLabel}>
          <Input
            id={confirmId}
            name={confirmName}
            type="password"
            placeholder={confirmPlaceholder}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required={required}
            disabled={disabled}
            className={confirmInputClassName}
            aria-describedby={confirmDescribedBy}
            aria-invalid={confirmation.length > 0 && !setupValidation.confirmation.matches}
          />
          {confirmation.length > 0 && !setupValidation.confirmation.matches && (
            <p id={confirmMismatchId} className="mt-2 text-sm text-[var(--danger)]" role="alert">
              {setupValidation.confirmation.message}
            </p>
          )}
        </FormField>
      )}
    </div>
  );
}
