"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@tgoliveira/secure-auth/react";
import {
  getPasskeyLoginUnsupportedMessage,
  isPasskeyLoginSupported,
  signInWithPasskey,
} from "@/features/passkey/sign-in-with-passkey";
import {
  PASSKEY_EMAIL_REQUIRED_MESSAGE,
  PASSKEY_LOGIN_CANCELLED_MESSAGE,
  PASSKEY_LOGIN_UNSUPPORTED_MESSAGE,
} from "@tgoliveira/secure-auth/client";
import { getPasskeyLoginHint } from "@tgoliveira/secure-auth/client";
import { readNamedFormField } from "@tgoliveira/secure-auth/client";
import { SocialSignIn } from "@/components/auth/social-sign-in";

export function LoginPasskeySection() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeySupportChecked, setPasskeySupportChecked] = useState(false);

  useEffect(() => {
    setPasskeySupported(isPasskeyLoginSupported());
    setPasskeySupportChecked(true);
  }, []);

  async function handlePasskeySignIn() {
    if (!passkeySupported) {
      setError(PASSKEY_LOGIN_UNSUPPORTED_MESSAGE);
      return;
    }

    setPasskeyLoading(true);
    setError("");

    try {
      const form = document.getElementById("login-credentials-form") as HTMLFormElement | null;
      const trimmedEmail = (form ? readNamedFormField(form, "email") : "").trim();
      const hint = getPasskeyLoginHint();
      if (!trimmedEmail && !hint?.credentialId && !hint?.userId) {
        setError(PASSKEY_EMAIL_REQUIRED_MESSAGE);
        return;
      }

      const result = await signInWithPasskey(
        trimmedEmail ? { email: trimmedEmail } : undefined
      );
      if (result.outcome === "cancelled") {
        setError(PASSKEY_LOGIN_CANCELLED_MESSAGE);
        return;
      }
      if (result.outcome === "unsupported") {
        setError(getPasskeyLoginUnsupportedMessage());
        return;
      }
      router.push(result.redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey sign-in failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <>
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-[var(--card)] px-2 text-[var(--muted)]">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={passkeyLoading || !passkeySupported}
        onClick={() => void handlePasskeySignIn()}
      >
        {passkeyLoading ? "Signing in…" : "Sign in with passkey"}
      </Button>
      {passkeySupportChecked && passkeySupported && (
        <p className="text-sm text-[var(--muted)]">
          Enter your email above, then sign in with the passkey registered to that account.
        </p>
      )}
      {passkeySupportChecked && !passkeySupported && (
        <p className="text-sm text-[var(--muted)]">{PASSKEY_LOGIN_UNSUPPORTED_MESSAGE}</p>
      )}

      <SocialSignIn />
    </>
  );
}
