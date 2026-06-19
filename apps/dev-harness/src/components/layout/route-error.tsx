"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { ErrorState } from "@tgoliveira/secure-auth/react";

interface RouteErrorProps {
  reset: () => void;
  message?: string;
}

export function RouteError({
  reset,
  message = "Something went wrong loading this page. Your account data was not changed.",
}: RouteErrorProps) {
  return (
    <PageLayout hideNav>
      <ErrorState message={message} onRetry={reset} />
    </PageLayout>
  );
}
