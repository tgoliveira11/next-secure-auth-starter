# Product Purpose — next-secure-auth-starter

## Purpose

`next-secure-auth-starter` exists to provide a reusable, secure, well-tested account and authentication foundation for new Next.js projects.

It should help future projects start with strong defaults for:

- authentication (email/password, OAuth, passkeys)
- account security (TOTP, session management, rate limiting)
- password recovery and email verification
- audit logs and safe logging
- mobile-first account/security UI

## Intended use

This project should be used as a **starter/template**.

A new project may:

- fork this repository
- use it as a GitHub template
- copy its modules into a new codebase
- adapt its account/security flows
- customize UI, branding, and product domain

## Non-goal

This is **not** intended to be a universal authentication library.

Authentication systems are tightly coupled to:

- framework and routing
- cookies and session strategy
- database schema
- deployment environment
- email infrastructure
- security policy
- account model
- UI flows

A starter/template is the right abstraction at this stage.

## Target users

Developers building modern web products that need:

- secure account creation and login
- social login (Google, Apple, Microsoft)
- passkeys
- optional TOTP
- password reset and email verification
- session management and revocation
- account deletion
- auditability
- strong test coverage (≥ 95%)

## Explicit exclusions

This starter must never include functionality from product-specific applications:

| Excluded | Reason |
| --- | --- |
| Encrypted private letters | Domain-specific, not auth infrastructure |
| Vault unlock | Domain-specific cryptography |
| User Vault Key / Letter Key | Domain-specific key lifecycle |
| Trusted devices for vault unlock | Vault-specific trust model |
| Vault recovery code | Vault-specific recovery |
| Passkey PRF vault envelopes | Vault-specific WebAuthn usage |
| Spiritual or community copy | Product-specific branding/content |

## Success criteria

The starter is successful when a new project can:

1. clone or fork the repository
2. configure environment variables
3. run database migrations
4. start the application
5. complete core account flows (register, login, verify email, reset password, manage sessions)
6. pass the full test suite at ≥ 95% coverage
7. customize branding and product pages **without** pulling in product-specific vault or letter code

## Relationship to source work

This starter is derived **conceptually** from account/security work done in another project. It must not copy product-specific code, schemas, UI copy, or domain logic from that project.

Only generic, reusable account/auth patterns belong here.
