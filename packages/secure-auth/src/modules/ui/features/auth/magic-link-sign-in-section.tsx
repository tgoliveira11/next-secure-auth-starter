"use client";

import { useState } from "react";
import { Alert } from "../../primitives/alert.js";
import { Button } from "../../primitives/button.js";
import { useSecureAuthUi } from "../../secure-auth-ui-provider.js";
import { accountAuthApi } from "@tgoliveira/secure-auth/client";
import { cn } from "@tgoliveira/secure-auth/client";

const dividerClassName = cn(
  "relative flex items-center py-2 text-xs uppercase tracking-wide text-[var(--muted)]",
  "before:mr-3 before:h-px before:flex-1 before:bg-[var(--border)]",
  "after:ml-3 after:h-px after:flex-1 after:bg-[var(--border)]"
);

export function MagicLinkSignInSection() {
  const ui = useSecureAuthUi();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ui || ui.magicLink?.enabled !== true) {
    return null;
  }

  async function handleRequestMagicLink() {
    const emailInput = document.getElementById("login-email") as HTMLInputElement | null;
    const email = emailInput?.value.trim() ?? "";
    if (!email) {
      setError("Enter your email address first.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await accountAuthApi.requestMagicLink(email);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send sign-in link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className={dividerClassName}>or</div>
      {message ? <Alert variant="success">{message}</Alert> : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button type="button" variant="secondary" className="w-full" disabled={loading} onClick={handleRequestMagicLink}>
        {loading ? "Sending link…" : "Sign in with email link"}
      </Button>
    </div>
  );
}
