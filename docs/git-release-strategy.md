# Git release strategy — monorepo transition

**Date:** 2026-06-11  
**Status:** Recommendations only — tags and push not executed.

---

## A. Repository history analysis

### `git log` findings

| Commit | Date | Message | Role |
| --- | --- | --- | --- |
| `52829d1` | 2026-06-11 | Initial commit: secure Next.js auth starter template. | **Only published commit** — standalone modular starter |

There is **one commit** on `main`. All monorepo/package extraction work exists as **uncommitted local changes** (~426 file deltas + untracked `apps/`, `packages/`).

### `git tags` findings

**No tags exist** today.

### Identified milestones

| Milestone | Git reference | Notes |
| --- | --- | --- |
| **Last standalone starter commit** | `52829d1` (`main` @ origin) | Root `src/`, root `drizzle/`, single `package.json` — pre-monorepo layout |
| **Monorepo extraction complete** | *Not committed yet* | Will be the **next commit** after `git add` + `git commit` on current working tree |

### Historical layout at `52829d1`

```text
src/                 # Standalone Next.js app
drizzle/             # Local migrations
package.json         # Single app
vitest.config.ts
```

### Target layout (working tree, uncommitted)

```text
packages/secure-auth/   # @tgoliveira/secure-auth
apps/starter/           # Integration harness
docs/                   # Monorepo documentation
```

---

## B. Recommended branch strategy

### Branch name

```text
feature/secure-auth-monorepo
```

### Why this name

| Criterion | Fit |
| --- | --- |
| Describes scope | Monorepo + package extraction, not a small fix |
| Distinguishable | Unlike `feature/auth-package-extraction`, explicitly signals workspace layout change |
| Conventional | `feature/` prefix for a major architectural milestone |
| Durable | Readable in `git log --graph` months later |

**Alternative:** `feature/auth-package-extraction` — valid if you want to emphasize the package over the workspace layout.

### Workflow

```bash
git checkout -b feature/secure-auth-monorepo
# stage, commit, push
git push -u origin feature/secure-auth-monorepo
# open PR → main
```

**Why not commit directly to `main`?** A PR preserves review context, CI signal, and a merge commit that marks the architectural boundary—even for solo maintainers.

---

## C. Recommended commit strategy

### Current status (pre-commit)

- **Modified/deleted:** legacy root app files (`src/`, `drizzle/`, root Next config, etc.)
- **Untracked:** `apps/`, `packages/`, `CHANGELOG.md`, new `docs/*`
- **Secrets:** `.env.local` gitignored — must not be staged

### Recommended commit message (Conventional Commits)

```text
refactor(auth): extract secure-auth package and monorepo architecture

Move authentication domain into @tgoliveira/secure-auth (packages/secure-auth)
and apps/starter as the integration harness. Migrate API route handlers and
tests into the package; deduplicate starter modules; abstract email delivery
behind EmailProvider; harden OAuth-only account deletion; document security
and repository readiness for 0.1.0-internal experimental release.
```

### Suggested commit body bullets (optional extended body)

- Monorepo workspaces: `packages/secure-auth` + `apps/starter`
- `createSecureAuth(config)` single factory entry point
- Route handler migration to package; starter thin wrappers
- Test migration: package vitest (123) + starter harness (230)
- EmailProvider abstraction; SMTP/console in starter only
- Security hardening: OAuth-only account deletion policy
- Starter deduplication (Phase 10): removed duplicated modules/shims
- Version `0.1.0-internal`; CHANGELOG and readiness docs

### Staging commands

```bash
git status
git add -A
git status   # verify no .env.local, no dist/, no .next/
git diff --cached --stat
```

---

## D. Tagging strategy (recommendations only — do not auto-create)

### Tag 1: `starter-final`

| Field | Value |
| --- | --- |
| **Name** | `starter-final` |
| **Target commit** | `52829d1` |
| **When to create** | **Before** merging the monorepo PR (or immediately after branching, while `main` still points here) |
| **Reason** | Permanent marker for the last standalone starter architecture; enables `git checkout starter-final` for comparison or hotfixes |

```bash
git tag -a starter-final 52829d1 -m "Final standalone starter before secure-auth monorepo extraction"
git push origin starter-final
```

### Tag 2: `secure-auth-v0.1.0-internal`

| Field | Value |
| --- | --- |
| **Name** | `secure-auth-v0.1.0-internal` |
| **Target commit** | The monorepo migration commit (hash TBD after commit) |
| **When to create** | After PR merge to `main`, or on the feature branch tip before merge |
| **Reason** | First identifiable internal package release; aligns with `CHANGELOG.md` and package version |

```bash
# After monorepo commit is on main:
git tag -a secure-auth-v0.1.0-internal -m "First internal @tgoliveira/secure-auth monorepo release (experimental)"
git push origin secure-auth-v0.1.0-internal
```

### Tag naming notes

- Use **annotated tags** (`-a`) for release markers — they store message, date, and tagger.
- Do **not** use `v1.0.0` — package is experimental `0.1.0-internal`.
- `starter-final` is a **historical** tag; `secure-auth-v0.1.0-internal` is a **release** tag.

---

## E. Pull request preparation

### PR title

```text
Extract @tgoliveira/secure-auth package and monorepo architecture
```

### PR description

```markdown
## Summary

Transforms the standalone Next.js auth starter into an npm workspaces monorepo:

- **`packages/secure-auth`** — reusable `@tgoliveira/secure-auth` package (`0.1.0-internal`)
- **`apps/starter`** — integration harness consuming public package exports only

This is the first major architectural milestone after the initial starter template (`52829d1` / tag `starter-final`).

## Architecture changes

- Monorepo: `packages/*` + `apps/*` workspaces
- `createSecureAuth(config)` factory with explicit runtime binding
- Auth/account API route handlers in package; starter thin App Router wrappers
- Drizzle schema + migrations in package (`packages/secure-auth/migrations/`)
- Starter deduplication: removed duplicated `modules/*` and `server/*` shims (kept email adapter)
- EmailProvider abstraction: package has no SMTP/nodemailer; starter owns delivery

## Security changes

- OAuth-only account deletion: session-bound re-auth, 15-minute window, provider-matched auth method
- Account deletion requires fully authenticated user (2FA-complete when enabled)
- `TODO_SECURITY_REVIEW_REQUIRED` removed from package code
- See `docs/security-hardening.md`

## Testing status

| Workspace | Tests | Status |
| --- | --- | --- |
| `@tgoliveira/secure-auth` | 123 (+1 skipped integration) | Pass |
| `@secure-auth/starter` | 230 | Pass |

```bash
npm run build && npm run typecheck && npm run lint && npm run test
```

## Documentation updates

- `CHANGELOG.md` — `0.1.0-internal` release entry
- `docs/repository-readiness.md` — pre-push audit
- `docs/git-release-strategy.md` — this transition plan
- `docs/architecture.md`, `docs/security-hardening.md`, `docs/migration-from-starter.md`
- Root + package + starter README onboarding

## Known limitations

- **Experimental** — not production-ready
- Repository constructor DI deferred to 0.2.x
- npm audit: 11 transitive vulnerabilities (documented; no `audit fix --force`)
- OAuth E2E: policy unit tests; manual provider validation for Google/Apple/Microsoft
- No root `LICENSE` file yet (`UNLICENSED` in package.json)

## Current maturity level

`0.1.0-internal` — private/internal experimental package. Not published to npm or GitHub Packages in this PR.

## Test plan

- [x] `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`
- [x] `npm run db:migrate` (Docker Postgres)
- [ ] Manual: register, login, 2FA, passkeys, OAuth (if configured)
- [ ] Verify `.env.local` not in diff
```

### Release summary (for GitHub release notes, optional)

```markdown
## secure-auth v0.1.0-internal

First internal monorepo release of `@tgoliveira/secure-auth`.

**Highlights:** package extraction, createSecureAuth, route migration, EmailProvider abstraction, OAuth account deletion hardening, starter deduplication.

**Not production-ready.** For internal evaluation only.

Full changelog: [CHANGELOG.md](../CHANGELOG.md)
```

---

## F. Release readiness assessment

| Question | Assessment | Rationale |
| --- | --- | --- |
| **Safe for first push?** | **Yes** | No secrets in tracked files; validation green; `.gitignore` hardened; docs complete |
| **Safe for internal package consumption?** | **Yes, with caveats** | Workspace linking works; consumers must run `build -w @tgoliveira/secure-auth` first; experimental API |
| **Safe for private GitHub Packages publication?** | **Yes, when explicitly chosen** | Metadata prepared (`publishConfig`, `0.1.0-internal`); build `dist/` before publish; not done in this push |
| **Ready for public open-source release?** | **No** | `UNLICENSED`; no `LICENSE`; experimental maturity; security gate not met; npm audit open |

---

## G. First push checklist

Execute manually before `git push`:

- [ ] **No secrets committed** — `git diff --cached` contains no `.env.local`, keys, or tokens
- [ ] **`.gitignore` reviewed** — env files, `dist/`, `.next/`, credentials patterns ignored
- [ ] **Validation commands passed** — install, build, typecheck, lint, test, db:migrate
- [ ] **Documentation updated** — README, architecture, security, migration guides
- [ ] **`CHANGELOG.md` created** — `0.1.0-internal` entry present
- [ ] **`docs/repository-readiness.md` created** — pre-push audit recorded
- [ ] **Package version reviewed** — `0.1.0-internal` in root, package, starter
- [ ] **Experimental status documented** — README, package README, CHANGELOG
- [ ] **npm audit findings documented** — `docs/security-hardening.md` / repository-readiness
- [ ] **Branch strategy defined** — `feature/secure-auth-monorepo` (or chosen alternative)
- [ ] **Commit message prepared** — Conventional Commits `refactor(auth): ...`
- [ ] **Tag strategy prepared** — `starter-final` → `52829d1`; `secure-auth-v0.1.0-internal` → monorepo commit
- [ ] **PR description prepared** — copy from section E above
- [ ] **Tag `starter-final` on `52829d1`** — before or independent of monorepo merge
- [ ] **`git status` clean of artifacts** — no `node_modules/`, `dist/`, `.next/` staged

### Suggested execution order

```bash
# 1. Tag historical starter (on current main)
git tag -a starter-final 52829d1 -m "Final standalone starter before monorepo"

# 2. Branch and commit monorepo
git checkout -b feature/secure-auth-monorepo
git add -A && git status
git commit -m "refactor(auth): extract secure-auth package and monorepo architecture"

# 3. Push branch and tag
git push -u origin feature/secure-auth-monorepo
git push origin starter-final

# 4. Open PR → merge to main

# 5. After merge, tag release
git checkout main && git pull
git tag -a secure-auth-v0.1.0-internal -m "First internal monorepo release"
git push origin secure-auth-v0.1.0-internal
```
