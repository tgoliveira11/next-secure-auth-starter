# Contributing

Conservative workflow for humans and AI agents working on `tgoliveira11/next-secure-auth-starter`.

## Repository parameters

| Item | Value |
| --- | --- |
| Default branch | `main` (no `develop`) |
| Package | `@tgoliveira/secure-auth` |
| Validate | `npm run validate` (local) · parallel jobs in [validate workflow](../.github/workflows/validate.yml) |
| Publish workflow | [`.github/workflows/publish-secure-auth.yml`](../.github/workflows/publish-secure-auth.yml) |
| OIDC environment | `npmjs` |

## Branch-first workflow

Before substantive work, create a branch from up-to-date `main`:

| Prefix | Use for |
| --- | --- |
| `feature/` | Behavior, API, UX |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `chore/` | CI, tooling, dependencies, release plumbing |

Rules:

- **Do not commit directly to `main`**, except when the repository owner explicitly requests it.
- **Never push to `main` without explicit owner approval.**
- **Do not open or merge PRs** until the owner asks.
- **Do not commit** until the owner asks — otherwise leave work uncommitted or on a feature branch.
- **No destructive git commands** (`push --force`, `reset --hard`, etc.) unless explicitly requested.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`
- Optional scope: `feat(admin): …`
- Clear subject; body only when it adds context.

## Pre-PR checklist (code changes)

Before opening a PR or declaring a task complete:

1. Run **`npm run validate`** (build, typecheck, lint, tests, coverage, app builds).
2. Add or update tests for changed behavior.
3. Update **`CHANGELOG.md`** → `## [Unreleased]` when behavior, API, schema, env vars, workers/cron, privacy, or visible UX changes.
4. Update **`docs/CURRENT_PRODUCT_SURFACE.md`** when exports, routes, published artifacts, or shipped/planned status changes.
5. Confirm no secrets (`.env`, credentials) are staged.

Trivial docs-only changes may skip `npm run validate`.

See [test-ci-performance-playbook.md](./test-ci-performance-playbook.md) when optimizing Vitest or CI wall clock.

## PR cycle

1. Open PR against `main` with `gh pr create` **only when the owner asks** (summary + test plan).
2. Do **not** merge, approve, or push without explicit owner approval.
3. Prefer **squash merge** (repository policy).
4. Address review feedback on the same branch.
5. After merge: `git checkout main && git pull`, delete merged local branch, confirm changelog/surface/tests before closing the task.

## Changelog and versions

- Work in progress → `CHANGELOG.md` → `## [Unreleased]`.
- **Agents do not bump versions**, create release tags, run the publish workflow, or `npm publish`.
- A new release requires a non-empty `Unreleased` section (the publish workflow bumps from those notes).
- Empty `Unreleased` → **recovery only** (retry npm/tag/GitHub Release for the version already in manifests).

See [publishing.md](./publishing.md) for the release invariant and recovery mode.

## Bot exceptions (not agent rules)

These automated paths may push to `main` without human/agent action:

| Workflow | Purpose |
| --- | --- |
| `publish-secure-auth.yml` | Release metadata commit (`Release x.y.z`) after manual dispatch |
| `sync-consumer-demo.yml` | Regenerated consumer-demo route files when package routes change |

Agents must not mimic these bots unless explicitly instructed.

## Related docs

- [publishing.md](./publishing.md) — manual publish, invariant, recovery
- [repo-settings.md](./repo-settings.md) — GitHub branch protection and environments
- [CURRENT_PRODUCT_SURFACE.md](./CURRENT_PRODUCT_SURFACE.md) — live product inventory
- [AGENTS.md](../AGENTS.md) — AI agent rules
