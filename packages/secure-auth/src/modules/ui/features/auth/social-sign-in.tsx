"use client";

import { signIn } from "next-auth/react";
import { Button } from "../../primitives/button.js";
import { OAuthProviderLogo } from "./oauth-provider-logos.js";
import { MICROSOFT_OAUTH_PROVIDER_ID } from "@tgoliveira/secure-auth/client";
import type { OAuthProviderId } from "../../../../core/ui-config.js";
import { useSecureAuthUi } from "../../secure-auth-ui-provider.js";

export type SocialSignInProps = {
  dividerLabel?: string;
  afterLoginPath?: string;
  /** Explicit provider IDs override `SecureAuthUIProvider`; omitted config fails closed. */
  providerIds?: readonly OAuthProviderId[];
};

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
  { id: "github", label: "Continue with GitHub" },
  { id: MICROSOFT_OAUTH_PROVIDER_ID, label: "Continue with Microsoft" },
] as const;

export function useConfiguredOAuthProviderIds(
  providerIds?: readonly OAuthProviderId[]
): readonly OAuthProviderId[] {
  const ui = useSecureAuthUi();
  return providerIds ?? ui?.oauthProviderIds ?? [];
}

export function formatOAuthProviderNames(providerIds: readonly OAuthProviderId[]): string {
  const names = SOCIAL_PROVIDERS.filter((provider) => providerIds.includes(provider.id)).map(
    (provider) => provider.label.replace("Continue with ", "")
  );
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function SocialSignIn({
  dividerLabel = "or continue with",
  afterLoginPath = "/dashboard",
  providerIds,
}: SocialSignInProps) {
  const configuredProviderIds = useConfiguredOAuthProviderIds(providerIds);
  const visibleProviders = SOCIAL_PROVIDERS.filter((provider) =>
    configuredProviderIds.includes(provider.id)
  );

  if (visibleProviders.length === 0) {
    return null;
  }

  return (
    <>
      <div className="relative text-center text-sm text-[var(--muted)]">
        <span className="relative z-10 bg-[var(--card)] px-2">{dividerLabel}</span>
        <div className="absolute inset-x-0 top-1/2 border-t border-[var(--border)]" aria-hidden="true" />
      </div>

      <div className="space-y-3">
        {visibleProviders.map((provider) => (
          <Button
            key={provider.id}
            variant="secondary"
            className="w-full"
            onClick={() => signIn(provider.id, { callbackUrl: afterLoginPath })}
          >
            <span className="inline-flex w-full items-center justify-center gap-2.5">
              <OAuthProviderLogo providerId={provider.id} />
              <span>{provider.label}</span>
            </span>
          </Button>
        ))}
      </div>
    </>
  );
}
