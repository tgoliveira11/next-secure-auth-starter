import { vi, beforeEach } from "vitest";
import {
  initSecureAuthRuntime,
  resetSecureAuthRuntimeForTests,
} from "../core/secure-auth-runtime.js";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "../modules/rate-limit/adapters/in-memory-adapter.js";
import { setRateLimitAdapterForTests } from "../modules/rate-limit/index.js";
import { buildTestSecureAuthConfig } from "./helpers/create-test-secure-auth.js";

vi.mock("server-only", () => ({}));

/** Bind default test runtime before handler modules load. */
initSecureAuthRuntime(buildTestSecureAuthConfig());

beforeEach(() => {
  resetAllInMemoryRateLimits();
  setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
  resetSecureAuthRuntimeForTests();
  initSecureAuthRuntime(buildTestSecureAuthConfig());
});
