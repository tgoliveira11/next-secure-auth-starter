"use client";

import { useMemo } from "react";
import { Input } from "../../primitives/input.js";
import { FormField, fieldDescribedBy } from "../../primitives/form-field.js";
import {
  assessPassword,
  getPasswordPolicyHint,
  getPasswordStrengthDisplay,
  shouldShowPasswordStrengthUi,
  type PasswordPolicyConfig,
} from "@tgoliveira/secure-auth/client/password-policy";
import type { PasswordStrengthFeedbackPosition } from "../../../../core/ui-config.js";
import { usePasswordStrengthPosition } from "../../pages/use-page-ui.js";
import { PasswordFieldFeedbackPlacement } from "./password-feedback-placement.js";
import { useResolvedPasswordPolicy } from "./use-resolved-password-policy.js";

interface PasswordStrengthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  confirmValue?: string;
  hint?: string;
  policyConfig?: Partial<PasswordPolicyConfig>;
  /** When false, hides strength feedback (e.g. current-password or confirm-only fields). */
  showStrength?: boolean;
  /** Override global password strength/validation feedback placement. */
  passwordStrengthPosition?: PasswordStrengthFeedbackPosition;
}

export function PasswordStrengthField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  confirmValue,
  hint,
  policyConfig,
  showStrength = true,
  passwordStrengthPosition: passwordStrengthPositionProp,
}: PasswordStrengthFieldProps) {
  const position = usePasswordStrengthPosition(passwordStrengthPositionProp);
  const feedbackId = `${id}-password-feedback`;
  const { policy: config, isLoading } = useResolvedPasswordPolicy(policyConfig);
  const assessment = useMemo(() => assessPassword(value, config), [value, config]);
  const strengthLabel = getPasswordStrengthDisplay(assessment.label);
  const showStrengthFeedback = showStrength && shouldShowPasswordStrengthUi(config);

  const validationMessages = useMemo(() => {
    const messages = showStrengthFeedback && value.length > 0 ? [...assessment.messages] : [];
    if (confirmValue !== undefined && confirmValue.length > 0 && confirmValue !== value) {
      messages.push("Passwords do not match.");
    }
    return messages;
  }, [assessment.messages, confirmValue, showStrengthFeedback, value]);

  const guidanceText =
    !isLoading && (hint ?? (showStrengthFeedback ? getPasswordPolicyHint(config) : undefined));

  const feedbackSlotEnabled = showStrengthFeedback || confirmValue !== undefined;

  const describedBy = fieldDescribedBy(
    id,
    undefined,
    undefined,
    feedbackSlotEnabled
  );

  const minLength =
    isLoading || config.enforcement === "off" ? undefined : config.minLength;

  const feedbackContent = (
    <>
      {value.length === 0 && guidanceText && <p>{guidanceText}</p>}
      {value.length > 0 && showStrengthFeedback && (
        <p>
          Strength: <span className="text-[var(--foreground)]">{strengthLabel}</span>
        </p>
      )}
      {validationMessages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </>
  );

  return (
    <FormField id={id} label={label}>
      <PasswordFieldFeedbackPlacement
        position={position}
        feedbackId={feedbackId}
        input={
          <Input
            id={id}
            type="password"
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            minLength={minLength}
            required
            aria-describedby={describedBy}
          />
        }
        feedback={feedbackContent}
        enabled={feedbackSlotEnabled}
      />
    </FormField>
  );
}
