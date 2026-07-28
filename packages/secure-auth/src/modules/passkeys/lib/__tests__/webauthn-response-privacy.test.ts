import { describe, expect, it } from "vitest";
import {
  containsSensitivePrfMaterial,
  hasPrfClientExtensionResult,
  releaseSensitiveClientExtensionResults,
  sanitizeWebAuthnResponseForSecureAuthServer,
} from "../webauthn-response-privacy";

describe("WebAuthn response privacy", () => {
  it("removes PRF without mutating the browser response and preserves other extensions", () => {
    const response = {
      id: "credential-id",
      clientExtensionResults: {
        credProps: { rk: true },
        prf: { enabled: true, results: { first: "PRF-SECRET-SENTINEL" } },
      },
    };

    const sanitized = sanitizeWebAuthnResponseForSecureAuthServer(response);

    expect(sanitized).toEqual({
      id: "credential-id",
      clientExtensionResults: { credProps: { rk: true } },
    });
    expect(response.clientExtensionResults.prf).toEqual({
      enabled: true,
      results: { first: "PRF-SECRET-SENTINEL" },
    });
    expect(JSON.stringify(sanitized)).not.toContain("PRF-SECRET-SENTINEL");
  });

  it("normalizes missing or malformed extension results to an empty object", () => {
    expect(
      sanitizeWebAuthnResponseForSecureAuthServer({ id: "credential-id" })
    ).toEqual({ id: "credential-id", clientExtensionResults: {} });
    expect(
      sanitizeWebAuthnResponseForSecureAuthServer({
        id: "credential-id",
        clientExtensionResults: null,
      })
    ).toEqual({ id: "credential-id", clientExtensionResults: {} });
  });

  it("rejects invalid response values", () => {
    expect(() => sanitizeWebAuthnResponseForSecureAuthServer(null as never)).toThrow(TypeError);
    expect(() => sanitizeWebAuthnResponseForSecureAuthServer([] as never)).toThrow(TypeError);
  });

  it.each([null, {}, { enabled: true }, { results: { first: "secret" } }])(
    "detects an own PRF result even when its value is %o",
    (prf) => {
      expect(hasPrfClientExtensionResult({ clientExtensionResults: { prf } })).toBe(true);
    }
  );

  it("does not treat inherited or unrelated extension keys as a PRF result", () => {
    const inherited = Object.create({ prf: { results: { first: "secret" } } });
    inherited.credProps = { rk: true };

    expect(hasPrfClientExtensionResult({ clientExtensionResults: inherited })).toBe(false);
    expect(
      hasPrfClientExtensionResult({ clientExtensionResults: { credProps: { rk: true } } })
    ).toBe(false);
  });

  it.each(["prfOutput", "prf_output", "prfHash", "prfResults", "prf-secret"])(
    "detects nested sensitive field %s",
    (key) => {
      expect(
        containsSensitivePrfMaterial({ clientExtensionResults: { nested: { [key]: null } } })
      ).toBe(true);
    }
  );

  it("does not reject normal nested WebAuthn fields", () => {
    expect(
      containsSensitivePrfMaterial({
        id: "credential-id",
        response: { clientDataJSON: "abc", authenticatorData: "def" },
        clientExtensionResults: { credProps: { rk: true }, largeBlob: { supported: true } },
      })
    ).toBe(false);
  });

  it("fails closed on cyclic or over-depth object graphs", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(containsSensitivePrfMaterial(cyclic)).toBe(true);

    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index < 20; index += 1) {
      deep.next = {};
      deep = deep.next as Record<string, unknown>;
    }
    expect(containsSensitivePrfMaterial(root)).toBe(true);
  });

  it("zeroes reachable PRF buffers and drops the browser response reference after hooks", () => {
    const output = new Uint8Array([1, 2, 3, 4]);
    const response = {
      clientExtensionResults: {
        credProps: { rk: true },
        prf: { results: { first: output.buffer } },
      },
    };

    releaseSensitiveClientExtensionResults(response);

    expect([...output]).toEqual([0, 0, 0, 0]);
    expect(response.clientExtensionResults).toEqual({ credProps: { rk: true } });
  });

  it("releases sensitive fields nested in arrays without looping on cycles", () => {
    const output = new Uint8Array([5, 6, 7, 8]);
    const nested = { prf_value: { first: output } };
    const extensionResults: Record<string, unknown> = { entries: [nested] };
    extensionResults.loop = extensionResults;

    expect(() =>
      releaseSensitiveClientExtensionResults({ clientExtensionResults: extensionResults })
    ).not.toThrow();

    expect([...output]).toEqual([0, 0, 0, 0]);
    expect(nested).not.toHaveProperty("prf_value");
    expect(extensionResults.loop).toBe(extensionResults);
  });

  it("never throws when best-effort cleanup encounters hostile extension fields", () => {
    const output = new Uint8Array([9, 10]);
    const extensionResults: Record<string, unknown> = {};
    Object.defineProperty(extensionResults, "prf", {
      configurable: false,
      enumerable: true,
      value: { first: output },
    });
    Object.defineProperty(extensionResults, "hostile", {
      enumerable: true,
      get: () => {
        throw new Error("hostile getter");
      },
    });

    expect(() =>
      releaseSensitiveClientExtensionResults({ clientExtensionResults: extensionResults })
    ).not.toThrow();
  });
});
