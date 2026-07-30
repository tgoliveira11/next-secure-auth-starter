import { describe, it, expect } from "vitest";
import { applyUIConfigOverrides, buildPublicUIConfig } from "../core/ui-config.js";
import { buildTestSecureAuthConfig, createTestSecureAuth } from "./helpers/create-test-secure-auth.js";

const base = buildPublicUIConfig(buildTestSecureAuthConfig());

describe("applyUIConfigOverrides", () => {
  it("returns the same config when there are no overrides", () => {
    expect(applyUIConfigOverrides(base, new Map())).toBe(base);
  });

  it("projects the admin two-step login toggle onto the UI config", () => {
    expect(base.login).toEqual({ twoStep: false });

    const overridden = applyUIConfigOverrides(base, new Map([["ui.login.twoStep", true]]));

    expect(overridden.login).toEqual({ twoStep: true });
    expect(base.login).toEqual({ twoStep: false });
  });

  it("accepts stringified booleans stored by the admin panel", () => {
    expect(
      applyUIConfigOverrides(base, new Map([["ui.login.twoStep", "true"]])).login
    ).toEqual({ twoStep: true });
    expect(
      applyUIConfigOverrides(base, new Map([["ui.login.twoStep", "false"]])).login
    ).toEqual({ twoStep: false });
  });

  it("ignores values of the wrong type", () => {
    const overridden = applyUIConfigOverrides(
      base,
      new Map<string, unknown>([
        ["ui.login.twoStep", "yes"],
        ["passwordPolicy.minLength", "20"],
        ["preferences.enabled", 1],
      ])
    );

    expect(overridden.login).toEqual(base.login);
    expect(overridden.passwordPolicy.minLength).toBe(base.passwordPolicy.minLength);
    expect(overridden.preferences).toEqual(base.preferences);
  });

  it("projects password policy and preferences overrides", () => {
    const overridden = applyUIConfigOverrides(
      base,
      new Map<string, unknown>([
        ["passwordPolicy.minLength", 16],
        ["preferences.enabled", true],
      ])
    );

    expect(overridden.passwordPolicy.minLength).toBe(16);
    expect(overridden.preferences).toEqual({ enabled: true });
  });

  it("leaves untouched keys alone", () => {
    const overridden = applyUIConfigOverrides(base, new Map([["invites.enabled", true]]));
    expect(overridden).toBe(base);
  });
});

describe("createSecureAuth().getResolvedUIConfig", () => {
  it("applies stored admin overrides", async () => {
    const secureAuth = createTestSecureAuth();
    const services = await secureAuth.getServices();
    services.configOverrideService.getOverrides = async () =>
      new Map<string, unknown>([["ui.login.twoStep", true]]);

    await expect(secureAuth.getResolvedUIConfig()).resolves.toMatchObject({
      login: { twoStep: true },
    });
  });

  it("falls back to the static config when the override store is unavailable", async () => {
    const secureAuth = createTestSecureAuth();
    const services = await secureAuth.getServices();
    services.configOverrideService.getOverrides = async () => {
      throw new Error("database unavailable");
    };

    await expect(secureAuth.getResolvedUIConfig()).resolves.toBe(secureAuth.uiConfig);
  });
});
