# Dependency security audit

**Last updated:** 2026-06-15  
**Package:** `@tgoliveira/secure-auth@0.1.11-internal`

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

## Remediation summary (0.1.11-internal)

| Package | Severity | Class | Path | Fix | Fixed version | Affects consumers? |
| --- | --- | --- | --- | --- | --- | --- |
| `drizzle-orm` | high | A | direct (peer + apps) | Direct upgrade | `0.45.2` | Yes — peer dependency |
| `happy-dom` | critical | B | starter, consumer-demo dev | Direct upgrade | `20.10.3` | No |
| `esbuild` | high | B | drizzle-kit, tsup, vite, vitest | Direct upgrades + root override | `0.28.1` | No |
| `drizzle-kit` | high | B | apps dev | Direct upgrade | `0.31.10` | No |
| `vitest` / `vite` | high | B | apps + package dev | Direct upgrade + esbuild override | vitest `3.2.6` | No |
| `tsup` | high | B | package dev | Direct upgrade + esbuild override | `8.5.1` | No |
| `nodemailer` | high | B | starter direct; `next-auth` optional peer | Direct upgrade + override | `9.0.3` | No (app-only; not in published package) |
| `uuid` | moderate | A/C | `next-auth` nested | `next-auth@4.24.14` + root override | `11.1.1` | Indirect — override replaces nested `uuid@8` used by NextAuth v4 |
| `postcss` | moderate | C | `next` bundled | Root override `next > postcss` | `8.5.15` | Indirect — Next still declares `8.4.31`; override supplies patched PostCSS at install time |
| `@esbuild-kit/*` | high | B | `drizzle-kit` transitive | esbuild override dedupes to safe build | `0.28.1` | No |

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

### uuid via next-auth (GHSA-w5hq-g745-h8pq)

- **Severity:** moderate  
- **Type:** transitive  
- **Production:** yes when consumers use NextAuth v4 with this package  
- **Dependency path:** `next-auth@4.24.14` → `uuid@^8.3.2`  
- **Strategy:** Upgrade to latest NextAuth v4 (`4.24.14`); override `"next-auth": { "uuid": "11.1.1" }`  
- **Consumer impact:** Override applies in monorepo install; consumers should mirror override or upgrade when NextAuth v4 drops uuid@8  
- **Residual risk:** **low** — uuid v11 is API-compatible for v4() usage in NextAuth; override validated by full test suite. Long-term fix is NextAuth v4 dependency bump or Auth.js v5 migration (out of scope for this release)  

### postcss via next (GHSA-qx2v-qp2m-jg93)

- **Severity:** moderate  
- **Type:** transitive  
- **Production:** yes (Next.js CSS pipeline)  
- **Dependency path:** `next@16.2.9` → `postcss@8.4.31`  
- **Strategy:** Root override `"next": { "postcss": "8.5.15" }` — npm audit clean  
- **Consumer impact:** Consumers on Next 16.2.x should apply the same override until Next bundles PostCSS ≥ 8.5.10  
- **Residual risk:** **low** — PostCSS 8.5.x is compatible with Next 16; `npm ls` may show semver “invalid” warnings because Next’s package.json still pins 8.4.31  

---

## Root `package.json` overrides

Applied when upstream manifests block safe transitive versions:

```json
"overrides": {
  "esbuild": "0.28.1",
  "postcss": "8.5.15",
  "nodemailer": "9.0.3",
  "uuid": "11.1.1",
  "happy-dom": "20.10.3",
  "next": { "postcss": "8.5.15" },
  "next-auth": { "uuid": "11.1.1", "nodemailer": "9.0.3" }
}
```

**Important:** After changing overrides, regenerate the lockfile (`rm package-lock.json && npm install`) so overrides take effect. Stale lockfiles can leave vulnerable nested copies.

---

## Published package verification

`npm pack -w @tgoliveira/secure-auth --dry-run` confirms the tarball contains:

- `dist/`, `migrations/`, `LICENSE`, `README.md`, `package.json`, `styles.css`
- **No** test sources, app code, `.env`, or devDependencies

Runtime dependencies in the published package: `@simplewebauthn/*`, `bcryptjs`, `otplib`, `qrcode`, `server-only`, `uuid`, `zod` — all at patched versions where applicable.

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
6. Run **Publish package to npmjs** on `main` — the workflow runs the audit gate automatically
