# Repository readiness report

**Date:** 2026-06-11  
**Purpose:** Pre-push review before first GitHub publication of the monorepo architecture.

---

## Repository status

| Item | Status |
| --- | --- |
| Monorepo structure | Ready — `packages/secure-auth` + `apps/starter` |
| Git working tree | **Pending first commit** — monorepo paths untracked; legacy root `src/` staged for deletion |
| Remote | `origin` → `https://github.com/tgoliveira11/next-secure-auth-starter.git` |
| License file | **Open** — `UNLICENSED` in package.json; no root `LICENSE` file yet |

### First-push git note

The working tree contains a **full monorepo migration** not yet committed:

- **Add:** `apps/`, `packages/`, new `docs/*`
- **Remove:** legacy root `src/`, root `drizzle/`, root Next.js config, `STARTER_CONTEXT_PROMPT.md`
- **Update:** root `README.md`, `package.json`, `package-lock.json`, `.gitignore`

Stage with `git add -A` after review. Do not commit `.env.local` files (gitignored).

See [git-release-strategy.md](./git-release-strategy.md) for branch, tag, commit, and PR recommendations.

---

## Version status

| Package | Version | Maturity |
| --- | --- | --- |
| Root `secure-auth` | `0.1.1-internal` | Experimental monorepo |
| `@tgoliveira/secure-auth` | `0.1.1-internal` | Experimental internal package |
| `@secure-auth/starter` | `0.1.1-internal` | Private integration harness |

**Strategy:** Stay on `0.1.x` prerelease (`-internal`) until API and migrations stabilize. Do **not** release `1.0.0` until security review sign-off and production readiness gate in `docs/security-hardening.md`.

---

## Secret and credential audit

### Scan performed

- Tracked files: no `.env.local`, `.pem`, `.key`, or token files
- Pattern scan: no GitHub tokens, Stripe keys, JWT blobs, or private keys in source
- Example env files: placeholders only (`replace-with-*`, empty OAuth fields)
- Local `.env.local` files: present on disk, **gitignored** (never in git history)

### Findings

| Finding | Risk | Action |
| --- | --- | --- |
| `.env.local` exists locally (root + starter) | Low if gitignored | **Do not commit.** Rotate secrets if ever pushed |
| `postgres:postgres` in `.env.example` / docker-compose | None | Local dev default only |
| Test fixtures use `test-secret-for-vitest-only` | None | Test-only strings |
| No `.npmrc` with tokens | — | Good — use env var per publishing guide |

### Rotation required?

**No** — no real secrets found in tracked files. If `.env.local` was ever committed historically, rotate all values in the secret checklist (`docs/security-hardening.md`).

---

## .gitignore review

Updated to ignore:

- `.env.development`, `.env.production`, `.env.test`
- `*.pem`, `*.key`, `*.crt`, `*.p12`, `*.pfx`
- `.npmrc.local`
- `tmp/`, `logs/`, `.pnpm-store/`, `.npm-cache/`

Already ignored: `node_modules/`, `.next/`, `dist/`, `coverage/`, `.turbo/`, `.DS_Store`

**Verified:** no `dist/`, `coverage/`, or `node_modules/` tracked.

---

## Artifact cleanup

| Checked | Result |
| --- | --- |
| `*.zip`, `*.sqlite`, `*.db` | None found |
| `packages/secure-auth/dist/` | Build output — gitignored, not tracked |
| Debug logs | None committed |
| Obsolete `STARTER_CONTEXT_PROMPT.md` | Removed from working tree |

Swagger UI assets in starter are copied at `postinstall` (not committed as duplicate in monorepo public folder from old root — old root `public/swagger-ui` removed in migration).

---

## Package metadata

`packages/secure-auth/package.json`:

| Field | Value |
| --- | --- |
| name | `@tgoliveira/secure-auth` |
| version | `0.1.1-internal` |
| license | `UNLICENSED` (internal) |
| repository | GitHub monorepo, `directory: packages/secure-auth` |
| publishConfig.registry | `https://npm.pkg.github.com` |
| files | `dist`, `migrations`, `README.md` |

**Not published yet.** Remove `private` blockers and run `npm publish` only after explicit release decision.

---

## Known limitations

- Experimental `0.1.x` — not production-ready
- Repository constructor DI deferred to 0.2.x
- OAuth provider E2E not in CI (manual checklist)
- Live PostgreSQL integration tests opt-in (`INTEGRATION_DATABASE_URL`)
- 6 ESLint React hooks warnings in starter UI (pre-existing)

---

## Known risks

| Risk | Level | Mitigation |
| --- | --- | --- |
| npm audit (11 findings) | Medium | Documented; no `audit fix --force` |
| OAuth deletion without provider step-up | Low | 15-minute session binding |
| Transitive `next-auth` / `nodemailer` CVEs | Medium | Track upstream updates |
| First push is large restructure | Low | Single reviewed PR recommended |

---

## Open items

- [ ] Add root `LICENSE` file (internal/proprietary policy)
- [ ] First commit + PR with monorepo migration
- [ ] GitHub Packages publish (when ready — not this push)
- [ ] Repository constructor DI (0.2.x)
- [ ] OAuth Playwright E2E in CI (optional)

---

## Security posture

See [security-hardening.md](./security-hardening.md).

- OAuth-only account deletion: **resolved**
- Email abstraction: **complete**
- Duplicate starter modules: **removed**
- `TODO_SECURITY_REVIEW_REQUIRED` in package code: **none**

---

## Testing status

| Workspace | Tests | Status |
| --- | --- | --- |
| `@tgoliveira/secure-auth` | 123 (+1 skipped integration) | Pass |
| `@secure-auth/starter` | 230 | Pass |

---

## Migration status

| Phase | Status |
| --- | --- |
| Monorepo structure | Complete |
| Package extraction | Complete |
| Route migration | Complete |
| Starter deduplication | Complete |
| Hardening | Complete |
| First GitHub push | **This release** |

---

## Final validation

Recorded: **2026-06-11** (pre-push review)

| Command | Result | Notes |
| --- | --- | --- |
| `npm install` | Pass | Lockfile updated for `0.1.0-internal` |
| `npm run build -w @tgoliveira/secure-auth` | Pass | |
| `npm run build` | Pass | Package + starter |
| `npm run typecheck` | Pass | |
| `npm run lint` | Pass | 6 pre-existing React hooks warnings |
| `npm run test` | Pass | 123 package (+1 skipped), 230 starter |
| `npm run db:migrate` | Pass | Requires Docker Postgres |
| `npm audit` | **11 vulnerabilities** | 9 moderate, 1 high, 1 critical — do not `audit fix --force` |
