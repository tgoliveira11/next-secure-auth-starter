import { describe, it, expect, vi } from "vitest";
import { createAuthOptions } from "../auth-options";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

function providerIdsFromConfig(
  config: ReturnType<typeof buildTestSecureAuthConfig>
): string[] {
  const options = createAuthOptions({
    config,
    repos: {} as never,
    authService: { recordLoginSuccess: vi.fn() } as never,
    authLoginService: {} as never,
    twoFactorService: { isEnabledForUser: vi.fn() } as never,
    accountSessionService: { mapProviderToAuthMethod: vi.fn() } as never,
  });

  return (options.providers ?? []).map((provider) => provider.id);
}

describe("createAuthOptions GitHub provider", () => {
  it("does not register GitHub when config is missing", () => {
    const ids = providerIdsFromConfig(buildTestSecureAuthConfig());
    expect(ids).not.toContain("github");
  });

  it("does not register GitHub when only clientId is present", () => {
    const ids = providerIdsFromConfig(
      buildTestSecureAuthConfig({
        oauth: { github: { clientId: "gh-id", clientSecret: "" } },
      })
    );
    expect(ids).not.toContain("github");
  });

  it("registers GitHub when clientId and clientSecret are present", () => {
    const ids = providerIdsFromConfig(
      buildTestSecureAuthConfig({
        oauth: {
          github: { clientId: "gh-id", clientSecret: "gh-secret" },
        },
      })
    );
    expect(ids).toContain("github");
  });
});
