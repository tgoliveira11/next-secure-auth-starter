"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { Card, CardDescription, CardHeader, CardTitle } from "@tgoliveira/secure-auth/react";
import { Button } from "@tgoliveira/secure-auth/react";
import { LoadingState } from "@tgoliveira/secure-auth/react";

export default function DashboardPage() {
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
        <LoadingState label="Loading dashboard" />
      </PageLayout>
    );
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <PageLayout width="medium">
      <PageHeader
        title="Dashboard"
        description="You are signed in. Manage your account security settings below."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Email, password, verification, and account deletion.</CardDescription>
          </CardHeader>
          <Link href="/settings/account">
            <Button variant="secondary">Open account settings</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sessions</CardTitle>
            <CardDescription>Review and revoke active sign-in sessions.</CardDescription>
          </CardHeader>
          <Link href="/settings/sessions">
            <Button variant="secondary">Manage sessions</Button>
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>Passkeys and optional two-factor authentication.</CardDescription>
          </CardHeader>
          <Link href="/settings/security">
            <Button variant="secondary">Open security settings</Button>
          </Link>
        </Card>
      </div>
    </PageLayout>
  );
}
