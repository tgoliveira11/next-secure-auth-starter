"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { PasskeySettings } from "../features/settings/passkey-settings.js";
import { TwoFactorSettings } from "../features/settings/two-factor-settings.js";
import { resolveAuthPaths, type SecuritySettingsPageProps } from "./types.js";

export function SecuritySettingsPage({
  title = "Security",
  description = "Manage passkeys and optional two-factor authentication for your account.",
  brand,
  header,
  className,
  width = "medium",
  paths,
  appSlug = "app",
  userId: userIdProp,
}: SecuritySettingsPageProps) {
  const resolved = resolveAuthPaths(paths);
  const { data: session, status } = useSession();
  const router = useRouter();
  const userId = userIdProp ?? session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(resolved.login);
    }
  }, [status, router, resolved.login]);

  if (status === "loading") {
    return (
      <PageShell width={width} className={className}>
        <LoadingState label="Loading security settings" />
      </PageShell>
    );
  }

  if (status !== "authenticated" || !userId) {
    return null;
  }

  return (
    <PageShell width={width} className={className}>
      {brand}
      {header}
      <PageHeader title={title} description={description} />
      <PasskeySettings userId={userId} appSlug={appSlug} />
      <TwoFactorSettings appSlug={appSlug} />
    </PageShell>
  );
}
