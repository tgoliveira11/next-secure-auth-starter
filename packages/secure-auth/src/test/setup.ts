import { vi, beforeEach } from "vitest";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "../modules/rate-limit/adapters/in-memory-adapter.js";

vi.mock("server-only", () => ({}));

const originalFetch = globalThis.fetch;

beforeEach(() => {
  resetAllInMemoryRateLimits();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("api.pwnedpasswords.com/range/")) {
        return {
          ok: true,
          text: async () => "",
        } as Response;
      }
      if (typeof originalFetch === "function") {
        return originalFetch(input, init);
      }
      throw new Error(`Unexpected fetch in test: ${url}`);
    })
  );
});
