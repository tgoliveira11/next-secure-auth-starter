import Link from "next/link";
import { AuthPageLayout } from "@/components/layout/auth-page-layout";
import { Card } from "@tgoliveira/secure-auth/react";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { CredentialsLoginForm } from "@/components/auth/credentials-login-form";
import { LoginPasskeySection } from "@/components/auth/login-passkey-section";

export default function LoginPage() {
  return (
    <AuthPageLayout>
      <PageHeader title="Welcome back" description="Sign in to your account." />

      <Card className="space-y-6">
        <CredentialsLoginForm />
        <LoginPasskeySection />
      </Card>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        No account?{" "}
        <Link href="/register" className="font-medium text-[var(--primary)] hover:underline">
          Create one
        </Link>
      </p>
    </AuthPageLayout>
  );
}
