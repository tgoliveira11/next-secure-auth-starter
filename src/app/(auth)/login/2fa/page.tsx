import { Suspense } from "react";
import { cookies } from "next/headers";
import { AuthPageLayout } from "@/components/layout/auth-page-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { CredentialsTwoFactorForm } from "@/components/auth/credentials-two-factor-form";
import { OAuthTwoFactorForm } from "@/components/auth/oauth-two-factor-form";
import { traceAuth } from "@/modules/auth/lib/auth-trace";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/modules/two-factor/lib/login-challenge-cookie";

type LoginTwoFactorPageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
  }>;
};

export default async function LoginTwoFactorPage({ searchParams }: LoginTwoFactorPageProps) {
  const params = await searchParams;
  const mode = params.mode;
  const cookieStore = await cookies();
  const challengePresent = Boolean(cookieStore.get(TWO_FACTOR_LOGIN_CHALLENGE_COOKIE)?.value);

  traceAuth("2fa_page_render", {
    mode: mode ?? "unknown",
    challengePresent,
    error: params.error ?? "",
  });

  return (
    <AuthPageLayout>
      <PageHeader
        title="Two-factor authentication"
        description="Enter the 6-digit code from your authenticator app to finish signing in."
      />

      <Card className="space-y-4">
        <Alert variant="info">
          This code protects your account sign-in only. It does not replace passkey sign-in or
          OAuth provider verification.
        </Alert>

        {mode === "credentials" ? (
          <CredentialsTwoFactorForm errorCode={params.error} />
        ) : (
          <Suspense fallback={null}>
            <OAuthTwoFactorForm />
          </Suspense>
        )}
      </Card>
    </AuthPageLayout>
  );
}
