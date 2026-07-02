# Test & CI performance playbook

Reusable guide for agents and humans optimizing Vitest suites and GitHub Actions validate pipelines in **next-secure-auth-starter**.

Adapted from cross-repo perf work (LiqSense `perf/faster-slow-tests`): ~8m25s → ~3–4m estimated CI wall clock and ~27s → ~12s local test runs when combining parallel jobs, Vitest environment split, and incremental caches.

Last updated: 2026-07-02

---

## 1. Diagnose before optimizing

### 1.1 Measure the CI pipeline

Open the slowest recent [Validate secure-auth](https://github.com/tgoliveira11/next-secure-auth-starter/actions) run and split wall time by job:

| Job | What it runs |
| --- | --- |
| `typecheck` | `build @tgoliveira/secure-auth` + `npm run typecheck` |
| `lint` | ESLint (dev-harness + consumer-demo; package lint is a no-op stub) |
| `test` | `npm run test:coverage` (package + dev-harness) |
| `build` | Full monorepo build + `npm pack --dry-run` |

After parallelization, **workflow wall clock ≈ max(job times)**, not their sum.

There is **no Postgres service** in PR CI — DB adapters are mocked in unit tests.

### 1.2 Read Vitest’s duration summary

After `vitest run`, look for:

```text
Duration Xs (transform …, setup …, import …, tests …, environment …)
```

| Phase | Meaning | Typical fix |
| --- | --- | --- |
| `environment` | happy-dom/node startup per worker | Vitest projects: `node` for `.test.ts`, `happy-dom` for `.test.tsx` |
| `import` | Module graph load | Static imports, thin modules, `deps.optimizer` for heavy SDKs |
| `tests` | Test body | Shared fixtures, mock I/O, remove real delays |
| `transform` | TS compile | Usually minor |

**Rule:** If `environment` ≫ `tests`, fix environment scoping before micro-optimizing individual tests.

### 1.3 Find slow files locally

```bash
npm run test -w @tgoliveira/secure-auth -- --reporter=verbose 2>&1 \
  | rg '[0-9]{3,}ms\)' | sort -t'(' -k2 -rn | head -30
```

Group by root cause: crypto/KDF, network delays, heavy imports, UI render.

---

## 2. Tier 1 — Vitest environment split (highest ROI)

### Problem

Forcing a DOM environment globally makes every `.test.ts` pay happy-dom/jsdom startup even when tests are pure logic.

### Solution (this repo)

Both **`packages/secure-auth/vitest.config.ts`** and **`apps/dev-harness/vitest.config.ts`** use Vitest **projects**:

| Project | Environment | Includes |
| --- | --- | --- |
| `unit` | `node` | `**/*.test.ts` |
| `ui` | `happy-dom` | `**/*.test.tsx` |

### Exceptions

If a `.test.ts` file needs DOM (`localStorage`, `document`, …), keep the file-level directive:

```typescript
/** @vitest-environment happy-dom */
```

Examples in dev-harness: `sign-out-client.test.ts`, `read-named-form-field.test.ts`, `sign-in-with-passkey.test.ts`.

### Verify

```bash
npm run test:coverage
```

Failures are loud and localized to the file that lost its environment.

---

## 3. Tier 1 — Parallel CI jobs

### Problem

`npm run validate` runs build → typecheck → lint → test → build **sequentially** (correct for local pre-push, slow in CI).

### Solution

[`.github/workflows/validate.yml`](../.github/workflows/validate.yml) runs **`typecheck`**, **`lint`**, **`test`**, and **`build`** in parallel after `npm ci`.

Local equivalent (sequential, full gate):

```bash
npm run validate
```

---

## 4. Tier 2 — Expensive test work

### 4.1 Shared crypto/KDF fixtures

Password hashing in every `it()` is expensive. Use lazy singleton fixtures per worker:

```typescript
let fixturesPromise: Promise<Fixtures> | null = null;

export function loadFixtures(): Promise<Fixtures> {
  if (!fixturesPromise) fixturesPromise = buildFixtures();
  return fixturesPromise;
}
```

Split loaders by cost tier; never run full KDF setup in tests that only need an already-wrapped key.

### 4.2 Remove real time delays in unit tests

Add optional delay parameters with production defaults unchanged; pass `0` in tests.

### 4.3 Extract lightweight modules

Move pure helpers out of modules that import heavy SDKs. Tests import the thin file.

### 4.4 Cache dynamic imports

Use `beforeAll` for repeated `import()` of the same module, or prefer static imports when mocks are hoisted.

---

## 5. Tier 2 — Vitest import optimization

For heavy ESM deps (if import phase dominates):

```typescript
test: {
  deps: {
    optimizer: {
      ssr: {
        enabled: true,
        include: ["some-heavy-package"],
      },
    },
  },
},
```

Use string package names. Run the full suite after enabling.

---

## 6. Tier 2 — CI caching

### ESLint

App workspaces use:

```bash
eslint . --cache --cache-location .eslintcache
```

CI restores `.eslintcache` via `actions/cache` (see validate workflow).

### TypeScript incremental

Each workspace `tsconfig.json` sets:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".cache/tsconfig.tsbuildinfo"
  }
}
```

CI caches `.cache/` directories. `.cache/` and `.eslintcache` are in [`.gitignore`](../.gitignore).

Cache keys hash `tsconfig.json` / `eslint.config.mjs` + `package-lock.json`, not every source file.

---

## 7. Node version in CI

CI uses **Node 22** (`actions/setup-node@v4`, `cache: npm`) — matches npm 11+ lockfiles without a global npm upgrade step.

Root `engines.node` remains `>=20` for local development flexibility.

---

## 8. Optional further wins

| Optimization | When | Savings |
| --- | --- | --- |
| Vitest sharding (`--shard=1/2`) | Test job still >3 min after env split | ~40–50% per shard |
| Move DB integration to nightly | Only a few files need real Postgres | Simpler PR CI |
| `test:unit` vs `test:integration` scripts | Clarity + faster local loops | Developer time |
| Build import diet | `next build` slow on route collection | Profile route imports |

---

## 9. Execution checklist for agents

- [ ] 1. Read latest CI run — note slowest job and Vitest duration breakdown
- [ ] 2. Count `*.test.ts` vs `*.test.tsx` — high ratio favors env split
- [ ] 3. Confirm Vitest projects (`unit` / `ui`) in package + dev-harness configs
- [ ] 4. Run `npm run test:coverage` — all green
- [ ] 5. Profile slow tests (>300ms) — fixtures, delays, imports
- [ ] 6. Add shared fixtures for repeated expensive ops
- [ ] 7. Parameterize production delays; pass `0` in tests
- [ ] 8. Extract thin modules; cache `beforeAll` imports
- [ ] 9. Add `deps.optimizer.ssr` if import phase dominates
- [ ] 10. Confirm parallel CI jobs in `validate.yml`
- [ ] 11. Confirm ESLint + tsc incremental caches
- [ ] 12. Confirm Node 22 in CI
- [ ] 13. Run `npm run validate` locally before merge
- [ ] 14. Update `CHANGELOG.md` and this doc when tooling changes
- [ ] 15. Open PR; compare CI wall clock before/after

---

## 10. This monorepo — applied changes

| Change | Location |
| --- | --- |
| Vitest projects (`node` / `happy-dom`) | `packages/secure-auth/vitest.config.ts`, `apps/dev-harness/vitest.config.ts` |
| Parallel CI jobs + caches + Node 22 | `.github/workflows/validate.yml` |
| ESLint `--cache` | `apps/dev-harness`, `apps/consumer-demo` `package.json` |
| tsc incremental `.cache/` | All workspace `tsconfig.json` files |
| `happy-dom` devDependency for package UI tests | `packages/secure-auth/package.json` |

---

## 11. Risks and validation

| Change | Risk | Mitigation |
| --- | --- | --- |
| `node` env for `.test.ts` | Hidden DOM usage | Per-file `@vitest-environment happy-dom` |
| Parallel CI | More concurrent runner minutes | Faster feedback; acceptable tradeoff |
| Shared fixtures | Mutable shared state | Read-only fixtures; unwrap per test if needed |
| ESLint/tsc caches | Stale cache edge cases | Keys hash lockfile + config files |

Always run **`npm run validate`** before merge.

---

## 12. Measuring success

Record before/after on `ubuntu-latest` for the **whole workflow** (not a single serial job):

| Metric | LiqSense before (reference) | LiqSense after (est.) | This repo target |
| --- | --- | --- | --- |
| CI workflow wall clock | ~8m25s | ~3–4m | ≈ max(parallel jobs), not sum |
| Vitest `environment` phase | ~183s | ~15–30s | Low vs total in `.test.ts`-heavy runs |
| Vitest `tests` execution | ~24s | ~17s | Stable or faster after env split |
| Local `npm run test:coverage` | ~27s | ~12s | Stable or faster after env split |

Re-measure after each tier; do not stack unverified estimates.

---

## Related docs

- [.cursor/rules/testing.md](../.cursor/rules/testing.md) — coverage thresholds and test hygiene
- [docs/contributing.md](./contributing.md) — `npm run validate` pre-PR checklist
