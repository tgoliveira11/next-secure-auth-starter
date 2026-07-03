import { describe, it, expect } from "vitest";
import {
  handleUserPreferencesError,
  readPreferencesNamespaceParam,
} from "../account/user-preferences-shared.js";
import { PreferencesDisabledError } from "@/modules/preferences/lib/preferences-errors.js";
import {
  PreferenceKeyLimitError,
  PreferenceNamespaceForbiddenError,
  PreferenceNotFoundError,
} from "@/modules/preferences/lib/preferences-errors.js";
import { PreferenceValidationError } from "@/modules/preferences/lib/preference-limits.js";
import { RateLimitError } from "@/modules/rate-limit/index.js";

describe("user-preferences-shared", () => {
  it("readPreferencesNamespaceParam uses default when query absent", () => {
    const request = new Request("http://localhost/api/account/preferences");
    expect(readPreferencesNamespaceParam(request, "demo-app")).toBe("demo-app");
  });

  it("readPreferencesNamespaceParam reads query value", () => {
    const request = new Request("http://localhost/api/account/preferences?namespace=widgets");
    expect(readPreferencesNamespaceParam(request, "demo-app")).toBe("widgets");
  });

  it("handleUserPreferencesError maps known errors", async () => {
    expect(
      (await handleUserPreferencesError(new PreferencesDisabledError(), "GET")).status
    ).toBe(404);
    expect(
      (await handleUserPreferencesError(new PreferenceValidationError("bad"), "PUT")).status
    ).toBe(400);
    expect((await handleUserPreferencesError(new RateLimitError("x"), "GET")).status).toBe(429);
    expect(
      (await handleUserPreferencesError(new PreferenceNotFoundError(), "GET")).status
    ).toBe(404);
    expect(
      (await handleUserPreferencesError(new PreferenceNamespaceForbiddenError(), "PUT")).status
    ).toBe(403);
    expect(
      (await handleUserPreferencesError(new PreferenceKeyLimitError(), "PATCH")).status
    ).toBe(400);
  });
});
