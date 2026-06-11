/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearPasskeyLoginHint,
  getPasskeyLoginHint,
  setPasskeyLoginHint,
} from "@/lib/passkey/login-hint";
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
    clearPasskeyLoginHint();
  });

  it("stores and reads userId with optional credentialId", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID, credentialId: "cred-id" });
  });

  it("reads credentialId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint({ credentialId: "cred-from-cookie" });
    localStorage.removeItem(credentialIdKey);
    expect(getPasskeyLoginHint()).toEqual({ credentialId: "cred-from-cookie" });
  });

  it("clears stored hint from localStorage and cookies", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    clearPasskeyLoginHint();
    expect(getPasskeyLoginHint()).toBeNull();
    expect(document.cookie).not.toContain(`${credentialIdKey}=`);
  });

  it("stores userId without credentialId", () => {
    setPasskeyLoginHint({ userId: USER_ID });
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID });
  });

  it("reads userId from cookies when localStorage is empty", () => {
    setPasskeyLoginHint({ userId: USER_ID });
    localStorage.removeItem(userIdKey);
    expect(getPasskeyLoginHint()).toEqual({ userId: USER_ID });
  });

  it("clears userId when updating hint without userId", () => {
    setPasskeyLoginHint({ userId: USER_ID, credentialId: "cred-id" });
    setPasskeyLoginHint({ credentialId: "cred-only" });
    expect(getPasskeyLoginHint()).toEqual({ credentialId: "cred-only" });
  });

  it("ignores empty cookie values", () => {
    document.cookie = `${userIdKey}=; path=/`;
    expect(getPasskeyLoginHint()).toBeNull();
  });
});
