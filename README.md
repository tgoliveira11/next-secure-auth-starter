# secure-auth monorepo

**`@tgoliveira/secure-auth`** is the product — opinionated **Next.js + TypeScript + Drizzle + PostgreSQL** account authentication.

**`apps/starter`** is a reference consumer that demonstrates integration through public exports only.

**`apps/consumer-demo`** is the canonical validation app — a minimal downstream consumer with no starter dependencies.

**Maturity:** `0.1.14-internal` experimental — not production-ready. See [docs/security.md](docs/security.md).

## Structure

```text
packages/secure-auth/   @tgoliveira/secure-auth — reusable auth package (private)
apps/starter/           @secure-auth/starter — reference integration app (feature-rich)
apps/consumer-demo/     @secure-auth/consumer-demo — minimal consumer validation app
docs/                   Architecture, security, consumer guides
```

## Integration model

1. Install `@tgoliveira/secure-auth` in your Next.js app.
2. Call **`createSecureAuth(config)`** once — sole composition root for routes and UI defaults.
3. Wire **`secureAuth.routes.*`** as thin App Router handlers.
4. Wrap your layout with **`SecureAuthUIProvider`** using **`secureAuth.uiConfig`**.
5. Mount package page components (`LoginPage`, `RegisterPage`, …) as thin route wrappers.

Start here: [docs/consumer-quick-start.md](docs/consumer-quick-start.md)

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

**Full variable reference:** [docs/configuration-reference.md](docs/configuration-reference.md)

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

OAuth (optional for local dev) — prefer `AUTH_*` names; legacy aliases still work in starter:

| Variable | Provider |
| --- | --- |
| `AUTH_GOOGLE_CLIENT_ID` / `AUTH_GOOGLE_CLIENT_SECRET` | Google |
| `AUTH_APPLE_CLIENT_ID` / `AUTH_APPLE_CLIENT_SECRET` | Apple |
| `AUTH_MICROSOFT_CLIENT_ID` / `AUTH_MICROSOFT_CLIENT_SECRET` | Microsoft |

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

### Consumer demo (minimal validation app)

```bash
cp apps/consumer-demo/.env.example apps/consumer-demo/.env.local
# Set NEXTAUTH_SECRET and TWO_FACTOR_SECRET_ENCRYPTION_KEY
npm run db:migrate:consumer
npm run dev:consumer
```

Open http://localhost:3002 — see [apps/consumer-demo/README.md](apps/consumer-demo/README.md).

Register → verify email (console logs link when `EMAIL_PROVIDER=console`) → sign in → explore `/settings/security` for 2FA and passkeys.

### Tests

```bash
npm run test
```

Package only: `npm run test -w @tgoliveira/secure-auth`  
Starter only: `npm run test -w @secure-auth/starter`  
Consumer demo: `npm run test -w @secure-auth/consumer-demo`

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

### Dependency security audit

Before each release, run:

```bash
npm run audit:security        # fails on high/critical (same gate as publish CI)
npm run audit:security:all    # full report
```

Policy, remediation history, and override rationale: [docs/security/dependency-audit.md](docs/security/dependency-audit.md).

The publish workflow runs `npm run audit:security` before `npm publish`.

### npm publish (automated)

Releases are published to [npm](https://www.npmjs.com/package/@tgoliveira/secure-auth) when tags matching `secure-auth-v0.1.*-internal` are pushed. Uses GitHub Actions + npm Trusted Publishing (OIDC) — no `NPM_TOKEN` secret.

See [docs/publishing-npm-automation.md](docs/publishing-npm-automation.md).

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
| Page copy/paths wrong | Pass `secureAuth.uiConfig` to `SecureAuthUIProvider` in root layout |

---

## Documentation

| Doc | Topic |
| --- | --- |
| **[docs/configuration-reference.md](docs/configuration-reference.md)** | **Canonical env vars and `createSecureAuth` config** |
| **[docs/consumer-quick-start.md](docs/consumer-quick-start.md)** | **New consumer onboarding (start here)** |
| [docs/minimal-consumer-example.md](docs/minimal-consumer-example.md) | Smallest working integration |
| [docs/consumer-validation-checklist.md](docs/consumer-validation-checklist.md) | Integration sign-off checklist |
| [docs/package-api.md](docs/package-api.md) | Supported public exports, `uiConfig`, routes |
| [docs/customization.md](docs/customization.md) | UI, email, and auth flow customization |
| [packages/secure-auth/README.md](packages/secure-auth/README.md) | Package overview |
| [apps/starter/README.md](apps/starter/README.md) | Reference consumer |
| [docs/architecture.md](docs/architecture.md) | Package-first model, composition root, boundaries |
| [docs/security.md](docs/security.md) | Security requirements and readiness |
| [docs/migrations.md](docs/migrations.md) | Database migrations and upgrade notes |
| [docs/publishing-npm-automation.md](docs/publishing-npm-automation.md) | Automated npm publish (Trusted Publishing) |
| [docs/publishing-private-package.md](docs/publishing-private-package.md) | Publishing overview (npm public registry) |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [AGENTS.md](AGENTS.md) | AI agent instructions |

## License

MIT © 2026 Thiago Oliveira. See [LICENSE](LICENSE).
