import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { checkPasswordBreached } from "../hibp-checker";
import { buildTestSecureAuthConfig } from "@/test/helpers/create-test-secure-auth";

function sha1(password: string): string {
  return createHash("sha1").update(password).digest("hex").toUpperCase();
}

describe("hibp checker", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when password hash suffix is in mocked response", async () => {
    const password = "PwnedPassword123!";
    const hash = sha1(password);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => `${hash.slice(5)}:123`,
    });

    await expect(checkPasswordBreached(password)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("returns false when password hash suffix is not in mocked response", async () => {
    const password = "UniquePassword123!";
    const hash = sha1(password);
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => "000000000000000000000000000000000:1",
    });

    await expect(checkPasswordBreached(password)).resolves.toBe(false);
  });

  it("returns false when fetch throws network error", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(checkPasswordBreached("AnyPassword123!")).resolves.toBe(false);
  });

  it("returns false when fetch times out", async () => {
    fetchMock.mockImplementation((_url, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    await expect(checkPasswordBreached("AnyPassword123!")).resolves.toBe(false);
  }, 10000);

  it("returns false without calling fetch when checkBreachedPasswords is false", async () => {
    const config = buildTestSecureAuthConfig({
      passwordPolicy: { checkBreachedPasswords: false },
    });

    await expect(checkPasswordBreached("AnyPassword123!", config)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
