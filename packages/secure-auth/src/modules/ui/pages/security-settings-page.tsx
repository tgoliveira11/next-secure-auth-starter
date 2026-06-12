"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageShell } from "../layouts/page-shell.js";
import { PageHeader } from "../primitives/page-header.js";
import { LoadingState } from "../primitives/loading-state.js";
import { PasskeySettings } from "../features/settings/passkey-settings.js";
import { TwoFactorSettings } from "../features/settings/two-factor-settings.js";
import { type SecuritySettingsPageProps } from "./types.js";
import { usePageTitle, useUiAppSlug, useUiMessage, useUiPaths } from "./use-page-ui.js";

export function SecuritySettingsPage({
  brand,
  header,
  className,
  width = "medium",
  paths,
  appSlug: appSlugProp,
  userId: userIdProp,
  title: titleProp,
  subtitle,
  description: descriptionProp,
}: SecuritySettingsPageProps) {
  const resolved = useUiPaths(paths);
  const appSlug = useUiAppSlug(appSlugProp);
  const title = usePageTitle({ title: titleProp, subtitle }, "securitySettingsTitle", "Security");
  const description = useUiMessage(
    descriptionProp,
    "securitySettingsDescription",
    "Manage passkeys and optional two-factor authentication for your account."
  );
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
