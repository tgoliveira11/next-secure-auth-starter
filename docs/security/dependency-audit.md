# Dependency security audit

**Last updated:** 2026-08-06
**Package:** `@tgoliveira/secure-auth@0.13.0`

This document records npm advisory findings, remediation actions, and residual risk for the monorepo. It complements [../security.md](../security.md).

---

## Policy

| Rule | Detail |
| --- | --- |
| **Before release** | Run `npm run audit:security` from the repo root |
| **CI gate** | Publish workflow fails on **high** or **critical** findings (`npm audit --audit-level=high`) |
| **No blind force-fix** | Do not run `npm audit fix --force` without reviewing every major/breaking change |
| **Prefer direct upgrades** | Bump direct dependencies first; use root `overrides` only when upstream pins block a safe version |
| **Document residuals** | Moderate issues blocked by upstream must be recorded here with risk assessment |

### Commands

```bash
npm run audit:security        # Fail on high/critical (release gate)
npm run audit:security:all    # Full report including moderate
npm run audit:security:json   # Machine-readable output
npm audit
npm ls esbuild drizzle-orm happy-dom
```

---

## Classification

| Class | Meaning |
| --- | --- |
| **A** | Runtime vulnerability affecting `@tgoliveira/secure-auth` consumers |
| **B** | Dev-only (build, test, migrate tooling) |
| **C** | Transitive, blocked by upstream until they release a fix |

Published tarball (`npm pack`) ships **runtime** `dependencies` only — not dev tooling (vitest, drizzle-kit, tsup, happy-dom).

---

## Remediation summary (current)

| Package | Severity | Class | Path | Fix | Fixed version | Affects consumers? |
| --- | --- | --- | --- | --- | --- | --- |
| `next` | high | A | apps + package peer/dev | Direct upgrade; peer minimum raised | `16.2.12` (peer `^16.2.11`) | Yes — consumers must satisfy the new peer minimum |
| `next-auth` | critical | A | apps + package peer/dev | Direct upgrade; peer minimum raised | `4.24.15` | Yes — fixes malformed bearer, email normalization, and provider-bound OAuth state findings |
| `postcss` | high | A/C | `next` bundled + build tooling | Root resolution | `8.5.23` | Indirect — Next still declares `8.4.31` |
| `sharp` | high | A/C | `next` optional dependency | Root resolution | `0.35.0` | Indirect — Next still declares `^0.34.5` |
| `brace-expansion` | high | B/C | ESLint, glob, coverage tooling | Root resolution + guarded minimatch 3 compatibility patch | `5.0.9` | No — monorepo tooling only |
| `js-yaml` | high | B | ESLint tooling | Direct root resolution and lockfile refresh | `4.3.1` | No |
| `esbuild` | low | B | drizzle-kit, tsup, vite, vitest | Root resolution | `0.28.1` | No |
| `uuid` | moderate | A | `next-auth` nested + package direct | NextAuth upgrade + root resolution | `11.1.1` | Indirect — NextAuth 4.24.15 now declares `^11.1.1` |
| `nodemailer` | high | B | dev-harness + `next-auth` optional peer | Direct upgrade + root resolution | `9.0.3` | No (app-only; not in published package) |

**Result:** `npm audit` reports **0 vulnerabilities** after lockfile regeneration with overrides applied.

---

## Per-issue detail

### drizzle-orm (GHSA — SQL injection advisory)

- **Severity:** high  
- **Type:** direct / peer  
- **Production:** yes (consumer apps + peer)  
- **Dependency path:** `@tgoliveira/secure-auth` peer → app `drizzle-orm`  
- **Strategy:** Upgrade all manifests to `^0.45.2`; verify `drizzle-kit@0.31.10` compatibility  
- **Consumer impact:** Consumers must use `drizzle-orm >= 0.45.2`  
- **Residual risk:** none when peer range satisfied  

### happy-dom (GHSA-37j7-fg3j-429f and related)

- **Severity:** critical  
- **Type:** direct dev  
- **Production:** no  
- **Dependency path:** `apps/*/devDependencies.happy-dom`, vitest optional peer  
- **Strategy:** Upgrade to `^20.10.3` in starter and consumer-demo  
- **Consumer impact:** none (not published)  
- **Residual risk:** none  

### esbuild (GHSA-67mh-4wv8-2f99, GHSA-gv7w-rqvm-qjhr, GHSA-g7r4-m6w7-qqqr)

- **Severity:** high  
- **Type:** transitive dev  
- **Production:** no  
- **Dependency path:** `drizzle-kit` → `@esbuild-kit/esm-loader`; `tsup`; `vitest` → `vite`  
- **Strategy:** Upgrade tsup, vitest, drizzle-kit; root override `"esbuild": "0.28.1"`  
- **Consumer impact:** none  
- **Residual risk:** none at audit time; `@esbuild-kit/*` packages are deprecated (merged into `tsx`) — monitor drizzle-kit for removal of legacy loader  

### nodemailer (moderate — GHSA-268h-hp4c-crq3, GHSA-wqvq-jvpq-h66f, GHSA-r7g4-qg5f-qqm2)

- **Severity:** moderate  
- **Type:** direct in starter; optional transitive via `next-auth`  
- **Production:** starter app only  
- **Dependency path:** `apps/dev-harness` → `nodemailer`; `next-auth` optional email provider  
- **Strategy:** Upgrade to `9.0.3` (latest 9.x; fixes GHSA-p6gq-j5cr-w38f); root override + `next-auth > nodemailer`  
- **Consumer impact:** none in published package (consumers supply their own `EmailProvider`)  
- **Residual risk:** none at audit time  

### NextAuth / Auth.js

- **Severity:** critical/high/moderate
- **Type:** direct peer/dev
- **Production:** yes
- **Dependency path:** consumer → `next-auth`
- **Strategy:** Raise the package peer minimum and all monorepo installs to `4.24.15`.
- **Consumer impact:** Consumers must upgrade to NextAuth `4.24.15` or newer in the v4 line.
- **Residual risk:** none for the advisories present at release time.

### uuid via next-auth (GHSA-w5hq-g745-h8pq)

- **Severity:** moderate  
- **Type:** transitive  
- **Production:** yes when consumers use NextAuth v4 with this package  
- **Dependency path:** `next-auth@4.24.15` → `uuid@^11.1.1`
- **Strategy:** Upgrade to NextAuth `4.24.15`; keep the monorepo resolution at uuid `11.1.1`.
- **Consumer impact:** Satisfied by the new NextAuth peer minimum.
- **Residual risk:** none at audit time.

### Next.js, PostCSS, and sharp

- **Severity:** high
- **Type:** transitive  
- **Production:** yes (Next.js CSS pipeline)  
- **Dependency path:** `next@16.2.12` → `postcss@8.4.31` and optional `sharp@^0.34.5`.
- **Strategy:** Raise the peer floor to patched Next `^16.2.11`, validate on `16.2.12`, and resolve PostCSS to `8.5.23` plus sharp to `0.35.0` in the monorepo.
- **Consumer impact:** Root overrides are not inherited from a published package. Consumer applications must keep their own audit clean and may need the same PostCSS/sharp resolutions until Next declares patched ranges.
- **Residual risk:** none in the validated monorepo tree; upstream dependency declarations remain a consumer-install concern.

### brace-expansion and js-yaml in tooling

- **Severity:** high
- **Type:** transitive dev
- **Production:** no
- **Dependency path:** ESLint/minimatch and Vitest coverage/glob tooling
- **Strategy:** Resolve brace-expansion to `5.0.9` and js-yaml to `4.3.1`. `scripts/apply-security-compat-patches.mjs` updates minimatch 3's CommonJS import and minimatch 9's CommonJS/ESM imports to accept brace-expansion 5's named export; it verifies the exact minimatch versions and source shapes before writing, then fails closed if upstream changes. Validate lint and coverage after the cross-major resolution.
- **Consumer impact:** none; these packages are not in the published tarball.
- **Residual risk:** none at audit time.

---

## Root `package.json` overrides

Applied when upstream manifests block safe transitive versions:

```json
"devDependencies": {
  "brace-expansion": "5.0.8",
  "esbuild": "0.28.1",
  "next": "^16.2.12",
  "postcss": "8.5.23",
  "sharp": "0.35.0"
},
"overrides": {
  "brace-expansion": "$brace-expansion",
  "esbuild": "$esbuild",
  "postcss": "$postcss",
  "sharp": "$sharp",
  "next": {
    ".": "$next",
    "postcss": "$postcss",
    "sharp": "$sharp"
  },
  "next-auth": { "uuid": "11.1.1", "nodemailer": "9.0.3" }
}
```

The root development dependencies are intentional resolution sources for npm's `$dependency` override syntax and are not included in the published package. After changing overrides, regenerate from a genuinely clean tree (`package-lock.json` and `node_modules` absent) so npm does not reuse stale nested versions.

The root `postinstall` script applies only the minimatch 3/9 compatibility imports described above. It does not alter the vulnerability fix or package versions; it makes the patched brace-expansion API callable by legacy tooling. A clean `npm ci` exercises this fail-closed patch before validation.

---

## Published package verification

`npm pack -w @tgoliveira/secure-auth --dry-run` confirms the tarball contains:

- `dist/`, `migrations/`, `LICENSE`, `README.md`, `package.json`, `styles.css`
- **No** test sources, app code, `.env`, or devDependencies

Runtime dependencies in the published package: `@node-rs/argon2`, `@simplewebauthn/*`, `bcryptjs` (legacy password verification and API keys), `otplib`, `qrcode`, `server-only`, `uuid`, `zod` — all at patched versions where applicable.

---

## Known unrelated build blocker

Starter and consumer-demo `next build` may fail with RSC boundary errors when thin app pages re-export client page components from `@tgoliveira/secure-auth/react` without a local `"use client"` boundary. This predates the dependency audit work and is tracked separately; it does not affect `npm pack` or package unit tests.

---

## Maintainer checklist (each release)

1. `npm install` (clean lockfile if overrides changed)
2. `npm run audit:security`
3. `npm run build -w @tgoliveira/secure-auth`
4. `npm run test`
5. Update this document if advisories or overrides change
6. Prepare and merge release metadata through a PR, then run **Publish package to npmjs** on `main` — the workflow repeats the audit gate automatically
