import { describe, it, expect } from "vitest";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  getSessionLastUsedUpdateIntervalMs,
  getSessionMaxAgeMs,
  isSingleActiveSessionEnabled,
} from "@/modules/sessions/lib/session-config";

describe("session config", () => {
  it("defaults last-used interval to 300 seconds", () => {
    const config = buildTestSecureAuthConfig();
    expect(getSessionLastUsedUpdateIntervalMs(config)).toBe(300_000);
  });

  it("parses custom last-used interval", () => {
    const config = buildTestSecureAuthConfig({
      sessions: { lastUsedUpdateIntervalSeconds: 120 },
    });
    expect(getSessionLastUsedUpdateIntervalMs(config)).toBe(120_000);
  });

  it("returns session max age in ms", () => {
    const config = buildTestSecureAuthConfig();
    expect(getSessionMaxAgeMs(config)).toBeGreaterThan(0);
  });

  it("falls back when config values are invalid", () => {
    const config = buildTestSecureAuthConfig({
      sessions: { lastUsedUpdateIntervalSeconds: -1, maxAgeSeconds: 0 },
    });
    expect(getSessionLastUsedUpdateIntervalMs(config)).toBe(300_000);
    expect(getSessionMaxAgeMs(config)).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("defaults singleActiveSession to false", () => {
    expect(isSingleActiveSessionEnabled(buildTestSecureAuthConfig())).toBe(false);
    expect(
      isSingleActiveSessionEnabled(
        buildTestSecureAuthConfig({ sessions: { singleActiveSession: true } })
      )
    ).toBe(true);
  });
});
