# Cursor Context Prompt — next-secure-auth-starter

You are starting a new repository named `next-secure-auth-starter`.

This repository is a secure Next.js authentication/account starter template.

It is derived conceptually from account/security work done in another project, but it must not include product-specific code from that project.

## Your first task

Set up the project context and documentation only, unless explicitly instructed to implement code.

Create and maintain the following documents:

- README.md
- ARCHITECTURE.md
- SECURITY.md
- AGENTS.md
- docs/PRODUCT_PURPOSE.md
- docs/MODULE_BOUNDARIES.md
- docs/USAGE_GUIDE.md
- docs/TESTING_STRATEGY.md
- docs/IMPLEMENTATION_ROADMAP.md
- .cursor/rules/architecture.md
- .cursor/rules/security.md
- .cursor/rules/testing.md
- .cursor/rules/documentation.md

## Core goal

Build a secure account/authentication starter for:

- Next.js
- TypeScript
- Auth.js/NextAuth
- PostgreSQL
- Drizzle
- React

## Features expected later

- email/password auth
- Google OAuth
- Apple Sign in
- Microsoft sign-in
- passkey login
- optional TOTP
- e-mail verification
- forgot/reset password
- change password
- active session management
- account deletion
- audit logs
- rate limiting
- SMTP/Mailpit email
- safe logging/redaction
- mobile-first account/security UI

## Explicit exclusions

Do not include:

- encrypted private letters
- vault unlock
- User Vault Key
- Letter Key
- trusted devices for vault unlock
- vault recovery code
- passkey PRF vault envelopes
- spiritual copy
- community features
- product-specific code from any other application

## Quality bar

Tests must cover at least:

```text
Statements >= 95%
Lines >= 95%
Functions >= 95%
Branches >= 95%
```

Do not lower thresholds.

## Documentation rule

Docs are part of the product.

Whenever implementation changes architecture, security, environment variables, providers, routes, or tests, update the documentation in the same change.

## Security rule

If a security-sensitive decision is unclear, stop and write:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```
