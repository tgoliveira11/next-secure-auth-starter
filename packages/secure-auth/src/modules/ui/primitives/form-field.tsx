import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface FormFieldProps {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ id, label, hint, error, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-[var(--muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldDescribedBy(
  id: string,
  hint?: string,
  error?: string,
  includeFeedback?: boolean
): string | undefined {
  const ids = [
    hint ? `${id}-hint` : null,
    includeFeedback ? `${id}-password-feedback` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
