"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { Card, CardDescription, CardHeader, CardTitle } from "../primitives/card.js";
import { LoadingState } from "../primitives/loading-state.js";
import { ActiveSessionsSettings } from "../features/settings/active-sessions-settings.js";
import { defaultSignOutAccount } from "@tgoliveira/secure-auth/react/client";
import { resolveAuthPaths, type SessionsSettingsPageProps } from "./types.js";

export function SessionsSettingsPage({
  title = "Active sessions",
  description = "Review browsers and devices signed in to your account.",
  brand,
  header,
  className,
  width = "medium",
  paths,
  onSignOut = defaultSignOutAccount,
}: SessionsSettingsPageProps) {
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
        <LoadingState label="Loading sessions" />
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

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Revoke sessions you do not recognize to sign those browsers out immediately.
          </CardDescription>
        </CardHeader>
        <ActiveSessionsSettings onSignOut={onSignOut} loginPath={resolved.login} />
      </Card>
    </PageShell>
  );
}
