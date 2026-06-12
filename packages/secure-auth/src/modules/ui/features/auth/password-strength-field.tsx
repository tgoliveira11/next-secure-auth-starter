"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "../../primitives/input.js";
import { FormField } from "../../primitives/form-field.js";
import {
  assessPassword,
  DEFAULT_PASSWORD_POLICY,
  getPasswordStrengthDisplay,
  shouldShowPasswordStrengthUi,
  type PasswordPolicyConfig,
} from "@tgoliveira/secure-auth/client/password-policy";

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
}: PasswordStrengthFieldProps) {
  const [loadedPolicy, setLoadedPolicy] = useState<PasswordPolicyConfig | null>(
    policyConfig ?? null
  );

  useEffect(() => {
    if (policyConfig) {
      setLoadedPolicy(policyConfig);
      return;
    }

    let cancelled = false;
    fetch("/api/auth/password-policy")
      .then((response) => (response.ok ? response.json() : DEFAULT_PASSWORD_POLICY))
      .then((config: PasswordPolicyConfig) => {
        if (!cancelled) setLoadedPolicy(config);
      })
      .catch(() => {
        if (!cancelled) setLoadedPolicy(DEFAULT_PASSWORD_POLICY);
      });

    return () => {
      cancelled = true;
    };
  }, [policyConfig]);

  const config = loadedPolicy ?? policyConfig ?? DEFAULT_PASSWORD_POLICY;
  const assessment = useMemo(() => assessPassword(value, config), [value, config]);
  const strengthLabel = getPasswordStrengthDisplay(assessment.label);
  const showStrengthFeedback = showStrength && shouldShowPasswordStrengthUi(config);

  const feedback = useMemo(() => {
    const messages = showStrengthFeedback ? [...assessment.messages] : [];
    if (confirmValue !== undefined && confirmValue.length > 0 && confirmValue !== value) {
      messages.push("Passwords do not match.");
    }
    return messages;
  }, [assessment.messages, confirmValue, showStrengthFeedback, value]);

  return (
    <FormField id={id} label={label} hint={hint}>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={config.enforcement === "off" ? undefined : config.minLength}
        required
      />
      {value.length > 0 && (showStrengthFeedback || feedback.length > 0) && (
        <div className="mt-2 space-y-1 text-sm text-[var(--muted)]" aria-live="polite">
          {showStrengthFeedback && (
            <p>
              Strength: <span className="text-[var(--foreground)]">{strengthLabel}</span>
            </p>
          )}
          {feedback.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </FormField>
  );
}
