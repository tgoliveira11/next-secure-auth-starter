import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildPasskeyLoginUserIdCookie } from "@/modules/auth/lib/auth-cookie-names";
import {
  clearPasskeyLoginHint,
  getPasskeyLoginHint,
  setPasskeyLoginHint,
} from "../login-hint";

const APP_SLUG = "test-app";

describe("passkey login hint storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { cookie: "" });
    const storage = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    };
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no hint is stored", () => {
    expect(getPasskeyLoginHint(APP_SLUG)).toBeNull();
  });

  it("stores and reads userId and credentialId from localStorage", () => {
    setPasskeyLoginHint(APP_SLUG, {
      userId: "user-1",
      credentialId: "cred-1",
    });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({
      userId: "user-1",
      credentialId: "cred-1",
    });
  });

  it("clears credentialId when omitted from hint", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: "user-1", credentialId: "cred-1" });
    setPasskeyLoginHint(APP_SLUG, { userId: "user-1" });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ userId: "user-1" });
  });

  it("clears userId when omitted from hint", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: "user-1", credentialId: "cred-1" });
    setPasskeyLoginHint(APP_SLUG, { credentialId: "cred-1" });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ credentialId: "cred-1" });
  });

  it("clears stored hint values", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: "user-1", credentialId: "cred-1" });
    clearPasskeyLoginHint(APP_SLUG);
    expect(getPasskeyLoginHint(APP_SLUG)).toBeNull();
  });

  it("falls back to cookies when localStorage is empty", () => {
    const cookieName = buildPasskeyLoginUserIdCookie(APP_SLUG);
    vi.stubGlobal("document", { cookie: `${cookieName}=user-from-cookie` });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ userId: "user-from-cookie" });
  });
});
