import { Suspense } from "react";
import { cookies } from "next/headers";
import { AuthPageLayout } from "@/components/layout/auth-page-layout";
import { PageHeader } from "@tgoliveira/secure-auth/react";
import { Card } from "@tgoliveira/secure-auth/react";
import { Alert } from "@tgoliveira/secure-auth/react";
import { CredentialsTwoFactorForm } from "@/components/auth/credentials-two-factor-form";
import { OAuthTwoFactorForm } from "@/components/auth/oauth-two-factor-form";
import { traceAuth } from "@/lib/auth-trace";
import { TWO_FACTOR_LOGIN_CHALLENGE_COOKIE } from "@/lib/two-factor-cookies";

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
