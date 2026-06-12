"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { LoadingState } from "@tgoliveira/secure-auth/react";
import { PasskeySettings } from "@/components/settings/passkey-settings";
import { TwoFactorSettings } from "@/components/settings/two-factor-settings";

export default function SecuritySettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <PageLayout width="medium">
        <LoadingState label="Loading security settings" />
      </PageLayout>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Security"
        description="Manage passkeys and optional two-factor authentication for your account."
      />

      {session?.user?.id && <PasskeySettings userId={session.user.id} />}
      <TwoFactorSettings />
    </PageLayout>
  );
}
