# next-secure-auth-starter

Secure, production-oriented starter template for account and authentication systems built with Next.js, Auth.js/NextAuth, PostgreSQL, Drizzle, and React.

The goal is to provide a strong foundation for new projects that need secure account management without rebuilding common authentication flows from scratch.

This starter is not a generic authentication library. It is a complete application template intended to be copied, forked, or used as a GitHub template for new products that share a similar technical stack.

## Status

**Post-hygiene cleanup — account/auth starter**

Vault, letters, and product-specific functionality from the source project have been removed. The codebase retains reusable account/authentication modules, routes, and tests.

See [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) for remaining starter hardening work.

## What this starter provides

The starter is intended to include:

- Email/password authentication
- Google OAuth
- Apple Sign in
- Microsoft sign-in
- Passkey account authentication
- Optional TOTP two-factor authentication
- Email verification
- Forgot/reset password
- Change password
- Account deletion
- Active session management
- Session revocation
- Audit logs
- Rate limiting
- Email provider abstraction
- SMTP/Mailpit support
- Safe logging and redaction
- Security-focused documentation
- Cursor/AI-agent rules
- PostgreSQL/Drizzle migrations
- Mobile-first account/security UI
- High test coverage (≥ 95% on all metrics)

## What this starter does not provide

This starter must not include product-specific functionality from any source project.

It must not include:

- Private encrypted letters
- User Vault Key lifecycle
- Letter Key lifecycle
- Vault unlock
- Trusted devices for vault unlock
- Vault recovery code
- Passkey PRF vault envelopes
- Spiritual product copy
- Community or prayer features
- Anonymous sharing
- Content moderation for letters

This starter is **account/auth/security infrastructure only**.

## Target stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React |
| Auth | Auth.js / NextAuth |
| Database | PostgreSQL |
| ORM | Drizzle |
| Unit/integration tests | Vitest |
| Component tests | Testing Library |
| E2E tests (optional) | Playwright |
| Local email | Mailpit |
| Production email | SMTP |

## Quality bar

All core functionality must be covered by tests.

Minimum coverage target:

```text
Statements: >= 95%
Lines:      >= 95%
Functions:  >= 95%
Branches:   >= 95%
```

Coverage thresholds must not be lowered to make tests pass.

## Security principle

Authentication is **account access only**.

This starter must not include any app-specific encrypted vault model. Future projects may add domain-specific encryption, but that must remain separate from the starter's account/auth modules.

If a security-sensitive design decision is unclear during implementation, stop and mark:

```text
TODO_SECURITY_REVIEW_REQUIRED:
This behavior affects account security and requires human review.
```

## Documentation

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modular monolith structure, modules, routing model |
| [SECURITY.md](SECURITY.md) | Security principles, token handling, logging |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents |
| [docs/PRODUCT_PURPOSE.md](docs/PRODUCT_PURPOSE.md) | Why this starter exists and who it is for |
| [docs/MODULE_BOUNDARIES.md](docs/MODULE_BOUNDARIES.md) | Module dependency rules and server/client separation |
| [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md) | How to fork, configure, and deploy |
| [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Coverage targets and critical test flows |
| [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) | Phased implementation plan |
| [.cursor/rules/](.cursor/rules/) | Cursor rules for architecture, security, testing, docs |

## Getting started

For humans and AI agents beginning work on this repository:

1. Read all files in [docs/](docs/).
2. Read [AGENTS.md](AGENTS.md).
3. Read [.cursor/rules/](.cursor/rules/).
4. Follow [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md) incrementally.
5. Keep docs updated with every architectural or security change.
6. Keep coverage at or above 95%.
7. Do not introduce product-specific code from any source project.

Implementation commands (`npm install`, migrations, etc.) will be documented here once Phase 1 begins.
