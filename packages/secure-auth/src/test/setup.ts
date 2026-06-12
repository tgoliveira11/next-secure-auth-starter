import { vi, beforeEach } from "vitest";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "../modules/rate-limit/adapters/in-memory-adapter.js";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  resetAllInMemoryRateLimits();
});
