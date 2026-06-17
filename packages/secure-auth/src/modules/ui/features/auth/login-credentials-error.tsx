"use client";

import { useSearchParams } from "next/navigation";

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password",
  invalid_request: "Could not sign in. Please check your details and try again.",
  unavailable: "Could not sign in right now. Please try again.",
  expired_challenge: "Your sign-in session expired. Please sign in again.",
  captcha_failed: "Please complete the verification challenge and try again.",
};

export function LoginCredentialsError({ message }: { message?: string }) {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");
  const resolvedMessage =
    message ?? (queryError ? LOGIN_ERROR_MESSAGES[queryError] : undefined);

  if (!resolvedMessage) return null;

  return (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {resolvedMessage}
    </p>
  );
}
