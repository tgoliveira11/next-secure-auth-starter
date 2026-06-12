#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(path, files);
    } else if (/\.tsx?$/.test(name)) {
      files.push(path);
    }
  }
  return files;
}

const importFixes = new Map([
  [
    "login-challenge-cookie.js",
    'import { getTwoFactorLoginChallengeCookieName } from "@/modules/two-factor/lib/login-challenge-cookie";',
  ],
  [
    "login-pending-cookie.js",
    'import { getLoginPendingTokenCookieName } from "@/modules/auth/lib/login-pending-cookie";',
  ],
]);

for (const file of walk(join(ROOT, "packages/secure-auth/src"))) {
  if (file.includes("login-challenge-cookie.ts") || file.includes("login-pending-cookie.ts")) continue;
  if (file.includes("auth-cookie-names.ts")) continue;
  let content = readFileSync(file, "utf8");
  const before = content;
  content = content.replaceAll("TWO_FACTOR_LOGIN_CHALLENGE_COOKIE", "getTwoFactorLoginChallengeCookieName()");
  content = content.replaceAll("LOGIN_PENDING_TOKEN_COOKIE", "getLoginPendingTokenCookieName()");
  if (content !== before) {
    if (content.includes("getTwoFactorLoginChallengeCookieName()") && !content.includes("login-challenge-cookie")) {
      content = `import { getTwoFactorLoginChallengeCookieName } from "@/modules/two-factor/lib/login-challenge-cookie";\n${content}`;
    }
    if (content.includes("getLoginPendingTokenCookieName()") && !content.includes("login-pending-cookie")) {
      content = `import { getLoginPendingTokenCookieName } from "@/modules/auth/lib/login-pending-cookie";\n${content}`;
    }
    writeFileSync(file, content);
  }
}

console.log("Cookie name replacements done.");
