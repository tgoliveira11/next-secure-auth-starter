/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearPasskeyLoginHint,
  getPasskeyLoginHint,
  setPasskeyLoginHint,
} from "@tgoliveira/secure-auth/client";
import { APP_SLUG } from "@/lib/brand";
import { USER_ID } from "@/test/helpers/fixtures";

describe("passkey login hint", () => {
  const userIdKey = `${APP_SLUG}-passkey-login-user-id`;
  const credentialIdKey = `${APP_SLUG}-passkey-login-credential-id`;

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (name) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    }
    clearPasskeyLoginHint(APP_SLUG);
  });

  it("stores and reads userId with optional credentialId", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: USER_ID, credentialId: "cred-id" });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ userId: USER_ID, credentialId: "cred-id" });
  });

  it("reads credentialId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint(APP_SLUG, { credentialId: "cred-from-cookie" });
    localStorage.removeItem(credentialIdKey);
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ credentialId: "cred-from-cookie" });
  });

  it("clears stored hint from localStorage and cookies", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: USER_ID, credentialId: "cred-id" });
    clearPasskeyLoginHint(APP_SLUG);
    expect(getPasskeyLoginHint(APP_SLUG)).toBeNull();
    expect(document.cookie).not.toContain(`${credentialIdKey}=`);
  });

  it("stores userId without credentialId", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: USER_ID });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ userId: USER_ID });
  });

  it("reads userId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: USER_ID });
    localStorage.removeItem(userIdKey);
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ userId: USER_ID });
  });

  it("clears userId when updating hint without userId", () => {
    setPasskeyLoginHint(APP_SLUG, { userId: USER_ID, credentialId: "cred-id" });
    setPasskeyLoginHint(APP_SLUG, { credentialId: "cred-only" });
    expect(getPasskeyLoginHint(APP_SLUG)).toEqual({ credentialId: "cred-only" });
  });

  it("ignores empty cookie values", () => {
    document.cookie = `${userIdKey}=; path=/`;
    expect(getPasskeyLoginHint(APP_SLUG)).toBeNull();
  });
});
