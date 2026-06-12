# AGENTS.md

This file defines instructions for AI coding agents working on `next-secure-auth-starter`.

## Core mission

Build and maintain **`@tgoliveira/secure-auth`** — a secure Next.js account/authentication package — with **`apps/starter`** as the reference integration app.

This is a reusable auth starter/template, not a product-specific application.

## Repository phase

Current phase: **Package-first architecture**

- **`packages/secure-auth`** is the product; changes here affect all consumers.
- **`apps/starter`** demonstrates integration only — keep it thin.
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

Whenever architecture, security behavior, environment variables, providers, routes, UI config, or testing strategy changes, update relevant docs **in the same change**.

At minimum review:

- README.md
- docs/architecture.md
- docs/security.md
- docs/package-api.md
- docs/consumer-quick-start.md
- packages/secure-auth/README.md
- apps/starter/README.md
- docs/*
- .cursor/rules/*

See [.cursor/rules/documentation.md](.cursor/rules/documentation.md) for the full update checklist.

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
| [docs/customization.md](docs/customization.md) | UI and config customization |
| [docs/migrations.md](docs/migrations.md) | Database migrations and upgrades |
| [packages/secure-auth/README.md](packages/secure-auth/README.md) | Package-specific overview |
