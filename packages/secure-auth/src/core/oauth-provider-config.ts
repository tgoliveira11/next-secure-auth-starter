import {
  isValidMicrosoftApplicationClientId,
  isValidMicrosoftTenantId,
  MICROSOFT_OAUTH_PROVIDER_ID,
  type MicrosoftProviderConfigIssue,
  type MicrosoftProviderEnv,
} from "../modules/auth/lib/microsoft-provider-config.js";
import type { SecureAuthConfig } from "./types.js";

export const SUPPORTED_OAUTH_PROVIDER_IDS = [
  "google",
  "apple",
  "github",
  MICROSOFT_OAUTH_PROVIDER_ID,
] as const;

export type OAuthProviderId = (typeof SUPPORTED_OAUTH_PROVIDER_IDS)[number];

export type ResolvedMicrosoftOAuthProvider =
  | { provider: MicrosoftProviderEnv; issue: null }
  | { provider: null; issue: MicrosoftProviderConfigIssue | null };

/** Resolves the effective Microsoft provider without exposing it to client bundles. */
export function resolveMicrosoftOAuthProvider(
  config: SecureAuthConfig
): ResolvedMicrosoftOAuthProvider {
  const microsoft = config.oauth?.microsoft;
  if (!microsoft?.clientId || !microsoft.clientSecret) {
    return {
      provider: null,
      issue:
        microsoft?.clientId || microsoft?.clientSecret ? "missing_credentials" : null,
    };
  }

  if (!isValidMicrosoftApplicationClientId(microsoft.clientId)) {
    return { provider: null, issue: "invalid_client_id_format" };
  }

  const tenantId = microsoft.tenantId?.trim() || "common";
  if (!isValidMicrosoftTenantId(tenantId)) {
    return { provider: null, issue: "invalid_tenant_id_format" };
  }

  return {
    provider: {
      clientId: microsoft.clientId,
      clientSecret: microsoft.clientSecret,
      tenantId,
    },
    issue: null,
  };
}

/**
 * Returns only provider IDs that the server will install in NextAuth.
 * This is safe for public UI config; credentials and tenant details never leave the server.
 */
export function resolveConfiguredOAuthProviderIds(
  config: SecureAuthConfig
): OAuthProviderId[] {
  const providerIds: OAuthProviderId[] = [];

  if (config.oauth?.google) providerIds.push("google");
  if (config.oauth?.apple) providerIds.push("apple");
  if (config.oauth?.github?.clientId && config.oauth.github.clientSecret) {
    providerIds.push("github");
  }
  if (resolveMicrosoftOAuthProvider(config).provider) {
    providerIds.push(MICROSOFT_OAUTH_PROVIDER_ID);
  }

  return providerIds;
}
