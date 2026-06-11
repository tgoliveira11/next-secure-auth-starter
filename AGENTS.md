# AGENTS.md

This file defines instructions for AI coding agents working on `next-secure-auth-starter`.

## Core mission

Build and maintain a secure Next.js account/authentication starter.

This is a starter/template, not a product-specific application.

## Repository phase

Current phase: **Phase 0 — Documentation and project context**

Do not implement application code unless explicitly instructed. When implementation begins, follow [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).

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
- use Server Actions for sensitive account operations unless explicitly reviewed.

## Coverage requirement

All metrics must remain at or above 95%:

```text
Statements >= 95%
Lines      >= 95%
Functions  >= 95%
Branches   >= 95%
```

Do not lower thresholds.

## Documentation requirement

Docs are part of the product.

Whenever architecture, security behavior, environment variables, providers, routes, or testing strategy changes, update relevant docs **in the same change**.

At minimum review:

- README.md
- ARCHITECTURE.md
- SECURITY.md
- docs/*
- .cursor/rules/*

See [.cursor/rules/documentation.md](.cursor/rules/documentation.md) for the full update checklist.

## Module boundaries

Follow [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md).

- Business logic lives in `src/modules/*`, not in route files.
- Server-only code must not be imported by client components.
- UI primitives must not import domain/server modules.

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
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before adding modules or routes |
| [SECURITY.md](SECURITY.md) | Before any auth/security change |
| [docs/PRODUCT_PURPOSE.md](docs/PRODUCT_PURPOSE.md) | Scope and non-goals |
| [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) | Before cross-module imports |
| [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md) | Environment and deployment |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Before writing tests |
| [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Implementation order |
