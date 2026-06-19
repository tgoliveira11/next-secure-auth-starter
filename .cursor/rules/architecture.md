# Cursor Rule — Architecture

Apply these rules when adding or modifying code in this monorepo.

## Package-first model

- **`packages/secure-auth`** (`@tgoliveira/secure-auth`) is the product.
- **`apps/dev-harness`** is the internal development harness — not a consumer reference.
- **`apps/consumer-demo`** is the canonical consumer reference — keep integration thin.
- Consumers integrate via **`createSecureAuth(config)`** only.
- Page defaults flow through **`secureAuth.uiConfig`** → **`SecureAuthUIProvider`**.
- Do not add product-specific vault, letter, or encryption-key lifecycle code.

## Routes vs modules

- Consumer route files under `apps/dev-harness/src/app` stay **thin**: delegate to `secureAuth.routes.*`.
- Package business logic lives in `packages/secure-auth/src/modules/*`, not in consumer route files or client components.

## Module boundaries

- Follow [docs/architecture.md](../../docs/architecture.md#module-boundaries).
- Import from module public APIs, not deep internal paths.
- `ui` is domain-neutral — no imports from auth, account, or database layers.

## Server/client separation

- Server-only code must not be imported by client components.
- Client components must not import database clients, repositories, or server secrets.
- Prefer Route Handlers for sensitive client-initiated operations over Server Actions unless explicitly reviewed.

## Auth.js

- Provider and session configuration lives in the package `auth` module.
- OAuth is account authentication only — minimal scopes.

## Changes

When adding a module or changing dependencies, update [docs/architecture.md](../../docs/architecture.md) and [docs/package-api.md](../../docs/package-api.md) in the same change.
