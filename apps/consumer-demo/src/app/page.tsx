/**
 * CONSUMER-DEMO CUSTOMIZATION
 * Public landing page — not part of @tgoliveira/secure-auth.
 *
 * Uses Button and Card from the package for visual consistency,
 * but the page layout, copy and feature list are consumer-owned.
 */

import Link from "next/link";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@tgoliveira/secure-auth/react";

const FEATURES = [
  {
    title: "Email & password",
    description: "Registration, login, forgot/reset password with configurable strength policy.",
  },
  {
    title: "Passkeys (WebAuthn)",
    description: "Touch ID / Face ID login with full FIDO2 credential management.",
  },
  {
    title: "Two-factor auth",
    description: "TOTP authenticator app with encrypted secrets and one-time backup codes.",
  },
  {
    title: "Magic link",
    description: "Passwordless sign-in via single-use email link, valid for 15 minutes.",
  },
  {
    title: "Session management",
    description: "Review active sessions, revoke by device, optional single-session enforcement.",
  },
  {
    title: "Security notifications",
    description: "Automatic email alerts on new login, password change, and 2FA events.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Top bar */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--primary)] text-[10px] font-bold text-white">
              CD
            </span>
            Consumer Demo
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="secondary" className="text-sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button className="text-sm">Create account</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">
            @tgoliveira/secure-auth · consumer validation app
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Auth, done right.
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-[var(--muted)]">
            A reference application that consumes the package through public exports only —
            no internal imports, no copy-pasted code. Everything you see is driven by
            one <code className="rounded bg-[var(--card-muted)] px-1.5 py-0.5 text-sm">createSecureAuth(config)</code> call.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button className="min-w-[160px]">Create account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="min-w-[160px]">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-2 text-center text-xl font-semibold text-[var(--foreground)]">
          What&apos;s included
        </h2>
        <p className="mb-10 text-center text-sm text-[var(--muted)]">
          Every feature below is provided by the package — zero custom auth code in this app.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle className="text-sm">{f.title}</CardTitle>
                <CardDescription className="text-xs">{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 text-xs text-[var(--muted)]">
          <span>Consumer Demo · validation app for @tgoliveira/secure-auth</span>
          <Link
            href="/api/auth/package-health"
            className="hover:text-[var(--foreground)] hover:underline"
          >
            Package health ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}
