import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/brand";

export default function HomePage() {
  return (
    <PageLayout width="wide" className="max-w-3xl text-center">
      <div className="mx-auto max-w-2xl space-y-8 py-8 md:py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
            Secure authentication starter
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-lg leading-relaxed text-[var(--muted)]">
            A production-oriented foundation for account management, social login, passkeys, optional
            TOTP, email verification, and session security.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link href="/register" className="sm:min-w-[160px]">
            <Button className="w-full">Create account</Button>
          </Link>
          <Link href="/login" className="sm:min-w-[160px]">
            <Button variant="secondary" className="w-full">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 text-left sm:grid-cols-3">
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Secure by default</CardTitle>
              <CardDescription>
                Hashed passwords, hashed tokens, rate limits, audit logs, and safe logging.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Modern sign-in</CardTitle>
              <CardDescription>
                Email/password, OAuth providers, passkeys, and optional TOTP two-factor authentication.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card muted>
            <CardHeader>
              <CardTitle className="text-base">Account controls</CardTitle>
              <CardDescription>
                Email verification, password reset, active sessions, and account deletion flows.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
