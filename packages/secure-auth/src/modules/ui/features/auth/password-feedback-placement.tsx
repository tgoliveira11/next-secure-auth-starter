"use client";

import type { ReactNode } from "react";
import { cn } from "../../lib/cn.js";
import type { PasswordStrengthFeedbackPosition } from "../../../../core/ui-config.js";

export type PasswordFeedbackSlotProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

/** Stable feedback region — always mounted when used; content updates in place. */
export function PasswordFeedbackSlot({ id, children, className }: PasswordFeedbackSlotProps) {
  return (
    <div
      id={id}
      className={cn("space-y-1 text-sm text-[var(--muted)] min-h-[1.25rem]", className)}
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export type PasswordFieldFeedbackPlacementProps = {
  position: PasswordStrengthFeedbackPosition;
  input: ReactNode;
  feedback: ReactNode;
  feedbackId?: string;
  feedbackClassName?: string;
  /** When true, keeps feedback slot(s) in the tree so the password input is never remounted. */
  enabled: boolean;
};

/**
 * Renders password validation/strength feedback above or below the password input.
 * The input always stays in the same React branch; only slot content changes.
 */
export function PasswordFieldFeedbackPlacement({
  position,
  input,
  feedback,
  feedbackId,
  feedbackClassName,
  enabled,
}: PasswordFieldFeedbackPlacementProps) {
  if (!enabled) {
    return <>{input}</>;
  }

  const slotSpacing = position === "above" ? "mb-2" : "mt-2";

  return (
    <div className="password-field-stack">
      {position === "above" && (
        <PasswordFeedbackSlot id={feedbackId} className={cn(slotSpacing, feedbackClassName)}>
          {feedback}
        </PasswordFeedbackSlot>
      )}
      {input}
      {position === "below" && (
        <PasswordFeedbackSlot id={feedbackId} className={cn(slotSpacing, feedbackClassName)}>
          {feedback}
        </PasswordFeedbackSlot>
      )}
    </div>
  );
}
