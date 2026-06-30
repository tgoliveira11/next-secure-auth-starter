import { describe, it, expect } from "vitest";
import {
  describeMicrosoftProviderConfigIssue,
  isMicrosoftProviderConfigured,
  isValidMicrosoftApplicationClientId,
  isValidMicrosoftTenantId,
  readMicrosoftProviderEnv,
} from "../microsoft-provider-config";

const VALID_GUID = "11111111-1111-4111-8111-111111111111";

function env(values: Record<string, string>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

describe("microsoft provider config", () => {
  it("validates client IDs and tenant IDs", () => {
    expect(isValidMicrosoftApplicationClientId(VALID_GUID)).toBe(true);
    expect(isValidMicrosoftApplicationClientId("not-a-guid")).toBe(false);
    expect(isValidMicrosoftTenantId("common")).toBe(true);
    expect(isValidMicrosoftTenantId(VALID_GUID)).toBe(true);
    expect(isValidMicrosoftTenantId("bad")).toBe(false);
  });

  it("returns null when credentials are absent", () => {
    expect(describeMicrosoftProviderConfigIssue(env({}))).toBeNull();
    expect(readMicrosoftProviderEnv(env({}))).toBeNull();
    expect(isMicrosoftProviderConfigured(env({}))).toBe(false);
  });

  it("detects partial credentials", () => {
    expect(
      describeMicrosoftProviderConfigIssue(env({ AUTH_AZURE_AD_ID: VALID_GUID }))
    ).toBe("missing_credentials");
  });

  it("detects invalid client ID format", () => {
    expect(
      describeMicrosoftProviderConfigIssue(
        env({
          AUTH_AZURE_AD_ID: "bad",
          AUTH_AZURE_AD_SECRET: "secret",
        })
      )
    ).toBe("invalid_client_id_format");
  });

  it("detects invalid tenant ID format", () => {
    expect(
      describeMicrosoftProviderConfigIssue(
        env({
          AUTH_AZURE_AD_ID: VALID_GUID,
          AUTH_AZURE_AD_SECRET: "secret",
          AUTH_AZURE_AD_TENANT_ID: "bad-tenant",
        })
      )
    ).toBe("invalid_tenant_id_format");
  });

  it("reads valid provider env with default tenant", () => {
    expect(
      readMicrosoftProviderEnv(
        env({
          AUTH_MICROSOFT_ID: VALID_GUID,
          AUTH_MICROSOFT_SECRET: "secret",
        })
      )
    ).toEqual({
      clientId: VALID_GUID,
      clientSecret: "secret",
      tenantId: "common",
    });
    expect(
      isMicrosoftProviderConfigured(
        env({
          AUTH_MICROSOFT_ID: VALID_GUID,
          AUTH_MICROSOFT_SECRET: "secret",
        })
      )
    ).toBe(true);
  });
});
