"use client";

import { useSearchParams } from "next/navigation";
import { getOAuthSignInErrorMessage } from "@tgoliveira/secure-auth/client";

export function OAuthSignInError() {
  const searchParams = useSearchParams();
  const message = getOAuthSignInErrorMessage(searchParams.get("error"));

  if (!message) return null;

  return (
    <p className="text-sm text-[var(--danger)]" role="alert">
      {message}
    </p>
  );
}
