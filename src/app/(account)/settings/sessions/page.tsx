"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ActiveSessionsSettings } from "@/components/settings/active-sessions-settings";

export default function SessionsSettingsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <PageLayout width="medium">
        <LoadingState label="Loading sessions" />
      </PageLayout>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Active sessions"
        description="Review browsers and devices signed in to your account."
      />

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Revoke sessions you do not recognize to sign those browsers out immediately.
          </CardDescription>
        </CardHeader>
        <ActiveSessionsSettings />
      </Card>
    </PageLayout>
  );
}
