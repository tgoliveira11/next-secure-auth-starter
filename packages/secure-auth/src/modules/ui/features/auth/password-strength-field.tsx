"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "../../primitives/input.js";
import { FormField, fieldDescribedBy } from "../../primitives/form-field.js";
import {
  assessPassword,
  DEFAULT_PASSWORD_POLICY,
  getPasswordPolicyHint,
  getPasswordStrengthDisplay,
  shouldShowPasswordStrengthUi,
  type PasswordPolicyConfig,
} from "@tgoliveira/secure-auth/client/password-policy";
import type { PasswordStrengthFeedbackPosition } from "../../../../core/ui-config.js";
import { usePasswordStrengthPosition, useUiPasswordPolicy } from "../../pages/use-page-ui.js";
import { PasswordFieldFeedbackPlacement } from "./password-feedback-placement.js";

interface PasswordStrengthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  confirmValue?: string;
  hint?: string;
  policyConfig?: PasswordPolicyConfig;
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
  const effectivePolicy = useUiPasswordPolicy(policyConfig);

  const [fetchedPolicy, setFetchedPolicy] = useState<PasswordPolicyConfig | null>(null);

  useEffect(() => {
    if (effectivePolicy) {
      return;
    }

    let cancelled = false;
    fetch("/api/auth/password-policy")
      .then((response) => (response.ok ? response.json() : DEFAULT_PASSWORD_POLICY))
      .then((config: PasswordPolicyConfig) => {
        if (!cancelled) setFetchedPolicy(config);
      })
      .catch(() => {
        if (!cancelled) setFetchedPolicy(DEFAULT_PASSWORD_POLICY);
      });

    return () => {
      cancelled = true;
    };
  }, [effectivePolicy]);

  const config = effectivePolicy ?? fetchedPolicy ?? DEFAULT_PASSWORD_POLICY;
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
    hint ?? (showStrengthFeedback ? getPasswordPolicyHint(config) : undefined);

  const feedbackSlotEnabled = showStrengthFeedback || confirmValue !== undefined;

  const describedBy = fieldDescribedBy(
    id,
    undefined,
    undefined,
    feedbackSlotEnabled
  );

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
            minLength={config.enforcement === "off" ? undefined : config.minLength}
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
