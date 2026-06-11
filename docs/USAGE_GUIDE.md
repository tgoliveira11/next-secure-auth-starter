# Usage Guide

## How to use this starter

This repository is intended to be used as a template for new secure Next.js applications.

Recommended workflow:

1. Create a new repository from this starter (GitHub "Use this template" or fork).
2. Rename the application and update branding.
3. Copy `.env.example` to `.env.local` and configure variables.
4. Start PostgreSQL (Docker Compose recommended).
5. Run database migrations.
6. Configure the email provider (Mailpit locally, SMTP in staging/production).
7. Configure OAuth providers as needed.
8. Run the full test suite and verify ≥ 95% coverage.
9. Customize product-specific pages outside the account/auth modules.

## Required environment areas

All required variables will be documented in `.env.example` once Phase 1 begins.

Expected configuration areas:

| Area | Examples |
| --- | --- |
| App | `APP_URL`, `NODE_ENV` |
| Auth.js | `AUTH_SECRET`, session settings |
| Database | `DATABASE_URL` |
| Email | provider mode, SMTP host/port/credentials |
| OAuth | Google, Apple, Microsoft client IDs and secrets |
| TOTP | encryption key for secrets at rest |
| Password policy | `PASSWORD_POLICY_ENFORCEMENT` |
| Sessions | max age, update age |
| Rate limiting | adapter selection, limits per operation |

Never commit `.env.local` or files containing real secrets.

## Local development

Recommended local dependencies (Phase 1+):

- PostgreSQL via Docker Compose
- Mailpit for email capture
- `.env.local` for secrets

Typical local email flow:

1. Start Mailpit.
2. Configure the email module to send via Mailpit SMTP.
3. Trigger verification or password reset.
4. Open the Mailpit UI to inspect captured messages.

Verification and reset links must not appear in application logs — use Mailpit or secure debug tooling only in development.

## OAuth setup notes

| Provider | Local development notes |
| --- | --- |
| Google | Supports localhost redirect URIs |
| Microsoft | Supports localhost redirect URIs |
| Apple | Usually requires HTTPS and a real or tunneled domain |

Configure redirect URIs to match `APP_URL` exactly.

Use minimal OAuth scopes — identity only unless a feature explicitly requires more.

## Email providers

| Environment | Recommended provider |
| --- | --- |
| Local | Mailpit (capture only) |
| CI | Console provider or test double |
| Staging | SMTP (sandbox or staging inbox) |
| Production | SMTP or transactional email service |

## Customization boundaries

Safe to customize:

- branding, colors, typography
- marketing and product pages outside `src/modules`
- OAuth provider enable/disable
- password policy strictness
- email templates (wording and layout)

Do not customize by:

- copying vault or letter encryption from other projects
- bypassing module boundaries
- storing tokens or passwords in plaintext
- lowering test coverage thresholds

## Production readiness checklist

Before production:

- [ ] Configure real SMTP provider
- [ ] Configure OAuth redirect URIs for production domain
- [ ] Rotate all secrets (Auth.js, OAuth, TOTP encryption, SMTP)
- [ ] Verify logging redaction in production log sink
- [ ] Verify rate limits on all sensitive endpoints
- [ ] Verify session revocation works end-to-end
- [ ] Verify account deletion removes/anonymizes data as documented
- [ ] Run full test suite with ≥ 95% coverage
- [ ] Review [SECURITY.md](../SECURITY.md)
- [ ] Review privacy/legal requirements for your jurisdiction

## Getting help during implementation

1. [ARCHITECTURE.md](../ARCHITECTURE.md) — structure and routing
2. [SECURITY.md](../SECURITY.md) — security requirements
3. [docs/MODULE_BOUNDARIES.md](MODULE_BOUNDARIES.md) — import rules
4. [docs/TESTING_STRATEGY.md](TESTING_STRATEGY.md) — what to test
5. [AGENTS.md](../AGENTS.md) — agent workflow and stop conditions
