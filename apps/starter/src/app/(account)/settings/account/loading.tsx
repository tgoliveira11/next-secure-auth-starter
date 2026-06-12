import { PageLayout } from "@/components/layout/page-layout";
import { LoadingState } from "@tgoliveira/secure-auth/react";

export default function AccountSettingsLoading() {
  return (
    <PageLayout width="medium">
      <LoadingState label="Loading account settings" />
    </PageLayout>
  );
}
