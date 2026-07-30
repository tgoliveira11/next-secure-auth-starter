"use client";

import Link from "next/link";
import { FormField } from "../../primitives/form-field.js";
import { Input } from "../../primitives/input.js";
import { useUiMessage } from "../../pages/use-page-ui.js";
import { cn } from "@tgoliveira/secure-auth/client";

/**
 * Shared DOM contract for the credentials form.
 *
 * `LoginPasskeySection` reads the email through `LOGIN_FORM_ID`, and
 * `MagicLinkSignInSection` reads it through `LOGIN_EMAIL_FIELD_ID`. Both single-step and
 * two-step layouts must keep these ids and the `email` field name stable.
 */
export const LOGIN_FORM_ID = "login-credentials-form";
export const LOGIN_EMAIL_FIELD_ID = "login-email";
export const LOGIN_PASSWORD_FIELD_ID = "login-password";
export const LOGIN_PASSWORD_BLOCK_ID = "login-password-block";
export const LOGIN_CONTINUE_BUTTON_ID = "login-continue";
export const LOGIN_SUBMIT_BUTTON_ID = "login-submit";

export const loginSubmitButtonClassName = cn(
  "min-h-11 w-full rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-colors",
  "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export type LoginEmailFieldProps = {
  /** Controlled value. Omit for the uncontrolled single-step form. */
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
};

export function LoginEmailField({ value, onChange, readOnly = false, autoFocus = false }: LoginEmailFieldProps) {
  return (
    <FormField id={LOGIN_EMAIL_FIELD_ID} label="Email">
      <Input
        id={LOGIN_EMAIL_FIELD_ID}
        name="email"
        type="email"
        autoComplete="username"
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        readOnly={readOnly}
        autoFocus={autoFocus}
        required
      />
    </FormField>
  );
}

export type LoginPasswordFieldProps = {
  required?: boolean;
  autoFocus?: boolean;
};

export function LoginPasswordField({ required = true, autoFocus = false }: LoginPasswordFieldProps) {
  return (
    <FormField id={LOGIN_PASSWORD_FIELD_ID} label="Password">
      <Input
        id={LOGIN_PASSWORD_FIELD_ID}
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus={autoFocus}
        required={required}
      />
    </FormField>
  );
}

export function ForgotPasswordLink({ href, label: labelProp }: { href: string; label?: string }) {
  const label = useUiMessage(labelProp, "forgotPasswordLinkLabel", "Forgot password?");
  return (
    <p className="text-right text-sm">
      <Link href={href} className="font-medium text-[var(--primary)] hover:underline">
        {label}
      </Link>
    </p>
  );
}
