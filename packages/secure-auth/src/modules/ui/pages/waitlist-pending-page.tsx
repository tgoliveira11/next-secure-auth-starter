"use client";

import { signOut } from "next-auth/react";
import { PageShell } from "./layouts/page-shell.js";
import { Button } from "./primitives/button.js";
import { Card } from "./primitives/card.js";
import { PageHeader } from "./primitives/page-header.js";
import { useUiPaths } from "./use-page-ui.js";

type WaitlistPendingPageProps = {
  brand?: React.ReactNode;
};

export function WaitlistPendingPage({ brand }: WaitlistPendingPageProps) {
  const resolved = useUiPaths();

  return (
    <PageShell width="narrow">
      {brand}
      <PageHeader
        title="Account pending approval"
        description="Your account has been created and is waiting for admin approval."
      />
      <Card className="space-y-4 text-center">
        <p className="text-sm text-[var(--muted)]">
          You&apos;ll receive an email when your account has been approved. Until then, you won&apos;t be
          able to sign in.
        </p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => signOut({ callbackUrl: resolved.login })}
        >
          Sign out
        </Button>
      </Card>
    </PageShell>
  );
}
