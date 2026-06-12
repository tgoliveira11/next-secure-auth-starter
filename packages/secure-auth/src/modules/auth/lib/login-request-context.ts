import { AsyncLocalStorage } from "node:async_hooks";

const STORE_KEY = Symbol.for("@tgoliveira/secure-auth/login-request-store");

type LoginRequestStore = AsyncLocalStorage<{ ip: string }>;

function store(): LoginRequestStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: LoginRequestStore;
  };
  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = new AsyncLocalStorage<{ ip: string }>();
  }
  return globalStore[STORE_KEY];
}

export function runWithLoginRequestContext<T>(ip: string, fn: () => T): T {
  return store().run({ ip }, fn);
}

export function getLoginRequestIp(): string | undefined {
  return store().getStore()?.ip;
}