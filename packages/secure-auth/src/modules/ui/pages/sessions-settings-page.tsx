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
import { type SessionsSettingsPageProps } from "./types.js";
import { usePageTitle, useUiMessage, useUiPaths } from "./use-page-ui.js";

export function SessionsSettingsPage({
  brand,
  header,
  className,
  width = "medium",
  paths,
  onSignOut = defaultSignOutAccount,
  title: titleProp,
  subtitle,
  description: descriptionProp,
}: SessionsSettingsPageProps) {
  const resolved = useUiPaths(paths);
  const title = usePageTitle(
    { title: titleProp, subtitle },
    "sessionsSettingsTitle",
    "Active sessions"
  );
  const description = useUiMessage(
    descriptionProp,
    "sessionsSettingsDescription",
    "Review browsers and devices signed in to your account."
  );
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
