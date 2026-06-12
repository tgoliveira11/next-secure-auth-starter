# secure-auth monorepo

Opinionated **Next.js + TypeScript + Drizzle + PostgreSQL** authentication — packaged as `@tgoliveira/secure-auth` with `apps/starter` as the integration harness.

**Maturity:** `0.1.0-internal` experimental — not production-ready. See [docs/security-hardening.md](docs/security-hardening.md) and [docs/repository-readiness.md](docs/repository-readiness.md).

## Structure

```text
packages/secure-auth/   @tgoliveira/secure-auth — reusable auth package (private)
apps/starter/           @secure-auth/starter — reference consumer app
docs/                   Architecture, security, migrations
```

---

## Local Development Quick Start

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Docker | 24+ (for PostgreSQL + Mailpit) |
| PostgreSQL | 16 (via Docker Compose) |

### Install

```bash
git clone <repo-url> secure-auth
cd secure-auth
npm install
npm run build -w @tgoliveira/secure-auth
```

### Environment

```bash
cp .env.example apps/starter/.env.local
```

Edit `apps/starter/.env.local`. Minimum required values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session signing secret (long random string) |
| `NEXTAUTH_URL` / `APP_BASE_URL` | App URL (default `http://localhost:3001` or `3002` per `.env.example`) |
| `TWO_FACTOR_SECRET_ENCRYPTION_KEY` | 32-byte base64 key for TOTP secrets at rest |
| `WEBAUTHN_RP_ID` | Passkey RP ID (`localhost` for dev) |
| `WEBAUTHN_ORIGIN` | Passkey origin (match app URL) |
| `EMAIL_PROVIDER` | `console` (dev) or `smtp` (Mailpit) |
| `EMAIL_FROM` | Sender address when not using console |

OAuth (optional for local dev):

| Variable | Provider |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | Apple |
| `AUTH_MICROSOFT_ID` / `AUTH_MICROSOFT_SECRET` | Microsoft |

Passkeys use `WEBAUTHN_*` above. SMTP dev defaults target Mailpit (`SMTP_HOST=localhost`, `SMTP_PORT=1025`).

### Infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL and Mailpit.

### Database

```bash
npm run db:migrate
```

### Development

```bash
npm run dev
```

Open the URL from `NEXTAUTH_URL` (e.g. http://localhost:3001).

Register → verify email (console logs link when `EMAIL_PROVIDER=console`) → sign in → explore `/settings/security` for 2FA and passkeys.

### Tests

```bash
npm run test
```

Package only: `npm run test -w @tgoliveira/secure-auth`  
Starter only: `npm run test -w @secure-auth/starter`

Optional live DB integration:

```bash
INTEGRATION_DATABASE_URL="$DATABASE_URL" npm run test -w @tgoliveira/secure-auth -- src/test/integration
```

### Build

```bash
npm run build
npm run typecheck
npm run lint
```

### Private package publish

See [docs/publishing-private-package.md](docs/publishing-private-package.md). **Not published publicly.**

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Build fails on first run | Run `npm run build -w @tgoliveira/secure-auth` before `npm run dev` |
| `database not initialized` | Ensure API routes load `@/lib/secure-auth` (calls `createSecureAuth`) |
| Migrations fail | `docker compose up -d`; check `DATABASE_URL` port matches compose |
| OAuth redirect errors | Match callback URL in provider console to `{APP_BASE_URL}/api/auth/callback/{provider}` |
| Microsoft OAuth | Use Entra **client ID** (GUID), Web redirect URI, restart after env changes |
| Passkeys fail locally | `WEBAUTHN_ORIGIN` must match browser URL exactly; use `localhost` not `127.0.0.1` |
| Emails not arriving | Use Mailpit UI (`http://localhost:8025`) when `EMAIL_PROVIDER=smtp` |

---

## Documentation

| Doc | Topic |
| --- | --- |
| [packages/secure-auth/README.md](packages/secure-auth/README.md) | Package API, EmailProvider |
| [apps/starter/README.md](apps/starter/README.md) | Starter harness |
| [docs/package-api.md](docs/package-api.md) | Public exports and route map |
| [docs/PACKAGE_HARDENING_REPORT.md](docs/PACKAGE_HARDENING_REPORT.md) | Package-purity hardening audit |
| [docs/security-hardening.md](docs/security-hardening.md) | Security tracker |
| [docs/documentation-audit.md](docs/documentation-audit.md) | Doc audit report |
| [docs/migration-from-starter.md](docs/migration-from-starter.md) | Standalone → monorepo |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [docs/repository-readiness.md](docs/repository-readiness.md) | Pre-push audit |
| [docs/git-release-strategy.md](docs/git-release-strategy.md) | Git tags, branch, PR strategy |

Legacy: [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md) — prefer `docs/` versions.
