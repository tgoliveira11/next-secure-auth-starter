# @secure-auth/starter

Integration harness for `@tgoliveira/secure-auth`. Demonstrates how a downstream Next.js app consumes the package through **official public exports only**.

## Local Development Quick Start

From the **monorepo root**:

```bash
npm install
npm run build -w @tgoliveira/secure-auth
cp .env.example apps/starter/.env.local   # or apps/starter/.env.local.example
docker compose up -d
npm run db:migrate
npm run dev
```

Open `NEXTAUTH_URL` from your env file (typically http://localhost:3001 or :3002).

### Required environment

See root [`.env.example`](../../.env.example). Minimum:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` / `APP_BASE_URL`
- `TWO_FACTOR_SECRET_ENCRYPTION_KEY`
- `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`
- `EMAIL_PROVIDER` (`console` or `smtp`)

### OAuth (optional)

Set provider client ID/secret in `.env.local`. Redirect URIs must match `{APP_BASE_URL}/api/auth/callback/{provider}`.

### Passkeys

Use `WEBAUTHN_ORIGIN` equal to the browser URL. Prefer `localhost` over `127.0.0.1`.

## How this app consumes the package

| Concern | Location |
| --- | --- |
| `createSecureAuth` | `src/lib/secure-auth.ts` |
| Email transport (SMTP/console) | `src/modules/email/core/` → `EmailProvider` |
| DB connection | `src/lib/db/index.ts` |
| API routes | Thin wrappers → `secureAuth.routes.*` |
| UI | `@tgoliveira/secure-auth/react` + app `components/` |

See [docs/starter-module-dedup-candidates.md](../../docs/starter-module-dedup-candidates.md).

## Commands

```bash
npm run dev -w @secure-auth/starter
npm run test -w @secure-auth/starter
npm run build -w @secure-auth/starter
npm run typecheck -w @secure-auth/starter
```

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Package not built | `npm run build -w @tgoliveira/secure-auth` |
| DB connection refused | `docker compose up -d`; verify `DATABASE_URL` port |
| No verification email | `EMAIL_PROVIDER=console` logs links to terminal |
| SMTP / Mailpit | `EMAIL_PROVIDER=smtp`, open http://localhost:8025 |
| OAuth Configuration error | Restart dev server after env changes |
| Account deletion blocked | OAuth-only accounts need a **recent** sign-in (15 min); sign in again |

## Validation (hardening phase)

| Check | Status |
| --- | --- |
| starter tests (230) | Pass |
| build / typecheck | Pass |
