#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dirname, "../src");

const REPLACEMENTS = [
  ["@/server/policies/rate-limit", "@/modules/rate-limit/index"],
  ["@/server/policies/password-hashing", "@/modules/security/policies/password-hashing"],
  ["@/server/repositories/user-repository", "@/modules/account/repositories/user-repository"],
  [
    "@/server/repositories/account-session-repository",
    "@/modules/sessions/repositories/account-session-repository",
  ],
  ["@/server/repositories/audit-repository", "@/modules/audit/repositories/audit-repository"],
  ["@/server/services/auth-login-service", "@/modules/auth/services/auth-login-service"],
  ["@/server/services/auth-service", "@/modules/auth/services/auth-service"],
  ["@/server/services/account-auth-service", "@/modules/account/services/account-auth-service"],
  ["@/server/services/account-service", "@/modules/account/services/account-service"],
  [
    "@/server/services/account-session-service",
    "@/modules/sessions/services/account-session-service",
  ],
  ["@/server/services/two-factor-service", "@/modules/two-factor/services/two-factor-service"],
  ["@/server/services/passkey-login-service", "@/modules/passkeys/services/passkey-login-service"],
  [
    "@/server/services/passkey-account-service",
    "@/modules/passkeys/services/passkey-account-service",
  ],
  ["@/server/services/passkey-service", "@/modules/passkeys/services/passkey-service"],
  ["@/lib/logger", "@/modules/security/logger/index"],
  ["@/lib/account-policy-config", "@/modules/account/lib/account-policy-config"],
  ["@/lib/password-policy", "@/modules/security/password-policy/index"],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, files);
    } else if (/\.tsx?$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

let total = 0;
for (const file of walk(SRC)) {
  let content = readFileSync(file, "utf8");
  let updated = content;
  for (const [from, to] of REPLACEMENTS) {
    updated = updated.split(from).join(to);
  }
  if (updated !== content) {
    writeFileSync(file, updated);
    total += 1;
  }
}
console.log(`Updated imports in ${total} files.`);
