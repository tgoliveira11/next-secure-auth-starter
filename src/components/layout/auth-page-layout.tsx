import { Suspense } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { AuthDebugPanel } from "@/components/auth/auth-debug-panel";

type AuthPageLayoutProps = {
  children: React.ReactNode;
  width?: "narrow" | "medium" | "wide";
};

export function AuthPageLayout({ children, width = "narrow" }: AuthPageLayoutProps) {
  const showTrace = process.env.NEXT_PUBLIC_AUTH_DEBUG_TRACE === "true";

  return (
    <PageLayout width={width} hideNav>
      {children}
      {showTrace && (
        <Suspense fallback={null}>
          <AuthDebugPanel />
        </Suspense>
      )}
    </PageLayout>
  );
}
