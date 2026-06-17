"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { Input } from "../../primitives/input.js";
import { FormField, fieldDescribedBy } from "../../primitives/form-field.js";
import {
  calculatePasswordStrength,
  getPasswordPolicyHint,
  getPasswordStrengthDisplay,
  shouldShowPasswordStrengthUi,
  validatePasswordAgainstPolicy,
  assessPassword,
  type PasswordPolicyConfig,
  type PasswordStrengthPosition,
  type PasswordValidationResult,
} from "@tgoliveira/secure-auth/client/password-policy";
import { PasswordFieldFeedbackPlacement } from "../auth/password-feedback-placement.js";
import { useResolvedPasswordPolicy } from "../auth/use-resolved-password-policy.js";
import { usePasswordStrengthPosition } from "../../pages/use-page-ui.js";
import { useControllableString } from "./use-controllable-string.js";
import { cn } from "../../lib/cn.js";

export type PasswordStrengthFieldProps = {
  id?: string;
  name?: string;
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  policy?: Partial<PasswordPolicyConfig>;
  /** @deprecated Use `policy` */
  policyConfig?: Partial<PasswordPolicyConfig>;
  feedbackPosition?: PasswordStrengthPosition;
  /** @deprecated Use `feedbackPosition` */
  passwordStrengthPosition?: PasswordStrengthPosition;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  feedbackClassName?: string;
  description?: ReactNode;
  onValidityChange?: (valid: boolean, result: PasswordValidationResult) => void;
  /** When false, hides strength feedback (e.g. confirm-only fields). */
  showStrength?: boolean;
  hint?: string;
  /** @deprecated Use `PasswordSetupFields` for confirmation. */
  confirmValue?: string;
};

export function PasswordStrengthField({
  id = "password",
  name,
  label = "Password",
  value,
  defaultValue,
  onChange,
  policy,
  policyConfig,
  feedbackPosition,
  passwordStrengthPosition,
  placeholder,
  autoComplete,
  disabled = false,
  required = true,
  className,
  inputClassName,
  feedbackClassName,
  description,
  onValidityChange,
  showStrength = true,
  hint,
  confirmValue,
}: PasswordStrengthFieldProps) {
  const resolvedPolicyInput = policy ?? policyConfig;
  const position = usePasswordStrengthPosition(feedbackPosition ?? passwordStrengthPosition);
  const [currentValue, setCurrentValue] = useControllableString(value, defaultValue, onChange);
  const feedbackId = `${id}-password-feedback`;
  const { policy: config, isLoading } = useResolvedPasswordPolicy(resolvedPolicyInput);

  const validation = useMemo(
    () => validatePasswordAgainstPolicy(currentValue, config),
    [currentValue, config]
  );
  const assessment = useMemo(() => assessPassword(currentValue, config), [currentValue, config]);
  const strengthLabel = getPasswordStrengthDisplay(assessment.label);
  const showStrengthFeedback = showStrength && shouldShowPasswordStrengthUi(config);

  useEffect(() => {
    onValidityChange?.(validation.valid, validation);
  }, [onValidityChange, validation]);

  const validationMessages = useMemo(() => {
    const messages = showStrengthFeedback && currentValue.length > 0 ? [...validation.messages] : [];
    if (confirmValue !== undefined && confirmValue.length > 0 && confirmValue !== currentValue) {
      messages.push("Passwords do not match.");
    }
    return messages;
  }, [confirmValue, currentValue, showStrengthFeedback, validation.messages]);

  const guidanceText =
    description ??
    (!isLoading && (hint ?? (showStrengthFeedback ? getPasswordPolicyHint(config) : undefined)));

  const feedbackSlotEnabled = showStrengthFeedback || confirmValue !== undefined;

  const describedBy = fieldDescribedBy(id, undefined, undefined, feedbackSlotEnabled);

  const minLength =
    isLoading || config.enforcement === "off" ? undefined : config.minLength;

  const feedbackContent = (
    <>
      {currentValue.length === 0 && guidanceText && <p>{guidanceText}</p>}
      {currentValue.length > 0 && showStrengthFeedback && (
        <p>
          Strength:{" "}
          <span className="text-[var(--foreground)]">
            {calculatePasswordStrength(currentValue, config)}
          </span>{" "}
          ({strengthLabel})
        </p>
      )}
      {validationMessages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </>
  );

  return (
    <FormField id={id} label={label} className={className}>
      <PasswordFieldFeedbackPlacement
        position={position}
        feedbackId={feedbackId}
        input={
          <Input
            id={id}
            name={name}
            type="password"
            placeholder={placeholder}
            autoComplete={autoComplete}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            minLength={minLength}
            required={required}
            disabled={disabled}
            className={inputClassName}
            aria-describedby={describedBy}
          />
        }
        feedback={feedbackContent}
        enabled={feedbackSlotEnabled}
        feedbackClassName={feedbackClassName}
      />
    </FormField>
  );
}
