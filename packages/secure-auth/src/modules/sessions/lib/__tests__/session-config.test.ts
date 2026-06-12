import { describe, it, expect, beforeEach } from "vitest";
import { initSecureAuthRuntime } from "@/core/secure-auth-runtime";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";
import {
  getSessionLastUsedUpdateIntervalMs,
  getSessionMaxAgeMs,
} from "@/modules/sessions/lib/session-config";

describe("session config", () => {
  beforeEach(() => {
    initSecureAuthRuntime(buildTestSecureAuthConfig());
  });

  it("defaults last-used interval to 300 seconds", () => {
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(300_000);
  });

  it("parses custom last-used interval", () => {
    initSecureAuthRuntime(
      buildTestSecureAuthConfig({
        sessions: { lastUsedUpdateIntervalSeconds: 120 },
      })
    );
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(120_000);
  });

  it("returns session max age in ms", () => {
    expect(getSessionMaxAgeMs()).toBeGreaterThan(0);
  });

  it("falls back when config values are invalid", () => {
    initSecureAuthRuntime(
      buildTestSecureAuthConfig({
        sessions: { lastUsedUpdateIntervalSeconds: -1, maxAgeSeconds: 0 },
      })
    );
    expect(getSessionLastUsedUpdateIntervalMs()).toBe(300_000);
    expect(getSessionMaxAgeMs()).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
