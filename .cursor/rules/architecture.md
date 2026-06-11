# Cursor Rule — Architecture

Apply these rules when adding or modifying code in `next-secure-auth-starter`.

## Structure

- Use **modular monolith** architecture — single Next.js app, internal modules under `src/modules/`.
- Do not create a monorepo or publish external packages in the initial version.
- Do not add product-specific vault, letter, or encryption-key lifecycle code.

## Routes vs modules

- Keep Next.js route files under `src/app` **thin**: parse request → call module service → return response.
- Business logic belongs in `src/modules/*`, not in route files or client components.

## Module boundaries

- Follow [docs/MODULE_BOUNDARIES.md](../../docs/MODULE_BOUNDARIES.md).
- Import from module public APIs (`@/modules/<name>`), not deep internal paths.
- `ui` is domain-neutral — no imports from auth, account, or database layers.

## Server/client separation

- Server-only code must not be imported by client components.
- Client components must not import database clients, repositories, or server secrets.
- Prefer Route Handlers for sensitive client-initiated operations over Server Actions unless explicitly reviewed.

## Auth.js

- Provider and session configuration lives in the `auth` module.
- OAuth is account authentication only — minimal scopes.

## Changes

When adding a module or changing dependencies, update ARCHITECTURE.md and docs/MODULE_BOUNDARIES.md in the same change.
