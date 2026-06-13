import Link from "next/link";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@tgoliveira/secure-auth/react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          @tgoliveira/secure-auth consumer validation
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">Consumer Demo</h1>
        <p className="text-[var(--muted)]">
          This app consumes the package through public exports only — no starter code, no package
          internals.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/register">
          <Button className="w-full sm:min-w-[160px]">Create account</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary" className="w-full sm:min-w-[160px]">
            Sign in
          </Button>
        </Link>
      </div>

      <Card className="w-full text-left">
        <CardHeader>
          <CardTitle className="text-base">Package health</CardTitle>
          <CardDescription>
            <Link href="/api/auth/package-health" className="text-[var(--primary)] hover:underline">
              GET /api/auth/package-health
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
