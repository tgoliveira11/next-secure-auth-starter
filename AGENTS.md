# AGENTS.md

This file defines instructions for AI coding agents working on `next-secure-auth-starter`.

## Core mission

Build and maintain **`@tgoliveira/secure-auth`** — a secure Next.js account/authentication package.

- **`apps/dev-harness`** — internal development harness for the package (not a consumer reference).
- **`apps/consumer-demo`** — canonical consumer integration reference; keep it updated with new routes and config.

This is a reusable auth starter/template, not a product-specific application.

## Repository phase

Current phase: **Package-first architecture**

- **`packages/secure-auth`** is the product; changes here affect all consumers.
- **`apps/consumer-demo`** demonstrates integration — keep it updated as the canonical consumer reference.
- **`createSecureAuth(config)`** is the sole composition root.
- **`SecureAuthUIProvider` + `secureAuth.uiConfig`** drive page defaults.
- No global runtime state — config and `db` are injected through factories.

## Non-negotiable rules

Do not:

- introduce product-specific Private Letters Vault code;
- add private encrypted letter functionality;
- add vault unlock functionality;
- store secrets in plaintext;
- log tokens or credentials;
- lower test coverage thresholds;
- bypass module boundaries;
- import database clients into client components;
- use Server Actions for sensitive account operations unless explicitly reviewed;
- expose internal package APIs (`createAuthServices`, `createRoutes`, deep `src/**` imports).

## Coverage requirement

All metrics must remain at or above **90%** on the package unit-test surface (see `packages/secure-auth/vitest.config.ts`):

```text
Statements >= 90%
Lines      >= 90%
Functions  >= 90%
Branches   >= 90%
```

Do not lower thresholds.

## Documentation requirement

Docs are part of the product.

Whenever architecture, security behavior, environment variables, providers, routes, UI config, or testing strategy changes, update relevant docs **in the same change**.

At minimum review:

- README.md
- docs/architecture.md
- docs/security.md
- docs/package-api.md
- docs/consumer-quick-start.md
- docs/CURRENT_PRODUCT_SURFACE.md (exports, routes, published artifacts)
- packages/secure-auth/README.md
- apps/dev-harness/README.md
- docs/*
- .cursor/rules/*

See [.cursor/rules/documentation.md](.cursor/rules/documentation.md) for the full update checklist.

For every consumer-visible change, add an entry under the appropriate `CHANGELOG.md` `Unreleased`
heading.

## Workflow (humans and agents)

See [docs/contributing.md](docs/contributing.md) for branch naming, PR cycle, and pre-PR checklist.

**Do not:**

- commit or push to `main` unless explicitly requested;
- open or merge PRs unless explicitly requested;
- bump versions, create release tags, run `npm publish`, or dispatch the publish workflow unless explicitly requested.

**Publishing** is manual-only. The owner dispatches [Publish package to npmjs](.github/workflows/publish-secure-auth.yml) on `main`. That workflow owns version bump (from `Unreleased`), release metadata commit, npm publication, `secure-auth-vX.Y.Z` tag, and GitHub Release. See [docs/publishing.md](docs/publishing.md) for the release invariant and recovery mode.

Exception: `github-actions[bot]` may push release metadata and consumer-demo route sync commits — agents must not mimic this unless instructed.

## Module boundaries

Follow [docs/architecture.md](docs/architecture.md#module-boundaries).

- Business logic lives in `packages/secure-auth/src/modules/*`, not in consumer route files.
- Server-only code must not be imported by client components.
- UI primitives and pages must not import domain/server modules directly.

## Security behavior

Authentication features must be account-only.

This starter must not contain vault/domain-specific cryptography.

Passkeys and TOTP are for **account authentication only** — not encryption key derivation or vault unlock.

## Stop condition

If a change affects authentication, sessions, tokens, secrets, OAuth, TOTP, passkeys, account deletion, or security boundaries and the correct design is unclear, stop and mark:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

## Document map

| File | When to read |
| --- | --- |
| [README.md](README.md) | Project overview and doc index |
| [docs/architecture.md](docs/architecture.md) | Package-first model, composition root, UI provider, boundaries |
| [docs/security.md](docs/security.md) | Before any auth/security change |
| [docs/package-api.md](docs/package-api.md) | Public exports and route map |
| [docs/consumer-quick-start.md](docs/consumer-quick-start.md) | Consumer integration |
| [docs/contributing.md](docs/contributing.md) | Branch, PR, changelog, validation |
| [docs/publishing.md](docs/publishing.md) | Manual publish, release invariant, recovery |
| [docs/CURRENT_PRODUCT_SURFACE.md](docs/CURRENT_PRODUCT_SURFACE.md) | Live exports, routes, migrations inventory |
| [docs/customization.md](docs/customization.md) | UI and config customization |
| [docs/migrations.md](docs/migrations.md) | Database migrations and upgrades |
| [packages/secure-auth/README.md](packages/secure-auth/README.md) | Package-specific overview |
