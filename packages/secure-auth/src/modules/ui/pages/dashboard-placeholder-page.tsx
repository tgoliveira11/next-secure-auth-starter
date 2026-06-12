"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../primitives/card.js";
import { Button } from "../primitives/button.js";
import { LoadingState } from "../primitives/loading-state.js";
import { resolveAuthPaths, type DashboardPlaceholderPageProps } from "./types.js";

/** Optional placeholder dashboard for starter/demo apps — not a core auth requirement. */
export function DashboardPlaceholderPage({
  title = "Dashboard",
  description = "You are signed in. Manage your account security settings below.",
  brand,
  header,
  className,
  width = "medium",
  paths,
}: DashboardPlaceholderPageProps) {
  const resolved = resolveAuthPaths(paths);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(resolved.login);
    }
  }, [status, router, resolved.login]);

  if (status === "loading") {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Loading dashboard" />
      </PageShell>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Email, password, verification, and account deletion.</CardDescription>
          </CardHeader>
          <Link href={resolved.accountSettings}>
            <Button variant="secondary">Open account settings</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
            <CardDescription>Review and revoke active sign-in sessions.</CardDescription>
          </CardHeader>
          <Link href={resolved.sessionsSettings}>
            <Button variant="secondary">Manage sessions</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>Passkeys and optional two-factor authentication.</CardDescription>
          </CardHeader>
          <Link href={resolved.securitySettings}>
            <Button variant="secondary">Open security settings</Button>
          </Link>
        </Card>
      </div>
    </PageShell>
  );
}
