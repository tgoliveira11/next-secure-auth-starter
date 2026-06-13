# @secure-auth/starter

Reference consumer for `@tgoliveira/secure-auth@0.1.2-internal`. Demonstrates integration through **official public exports only**.

For a **minimal** downstream consumer with no starter dependencies, see [apps/consumer-demo](../consumer-demo).

**Building a new app?** Start with [docs/consumer-quick-start.md](../../docs/consumer-quick-start.md), not this README alone.

---

## How this app consumes the package

| Concern | Location | Public export |
| --- | --- | --- |
| Composition root | `src/lib/secure-auth.ts` | `@tgoliveira/secure-auth/next` → `createSecureAuth` |
| UI provider | `src/app/layout.tsx` + `src/components/providers.tsx` | `SecureAuthUIProvider` + `secureAuth.uiConfig` |
| Email transport | `src/modules/email/core/` | `@tgoliveira/secure-auth/email` → `EmailProvider` |
| DB connection | `src/lib/db/index.ts` | `@tgoliveira/secure-auth/drizzle/schema` |
| API routes | `src/app/api/**/route.ts` | `secureAuth.routes.*` |
| NextAuth OAuth | `src/lib/nextauth-route.ts` | `createNextAuthRouteHandlers` from `/next` |
| Auth pages | `src/app/(auth)/**/page.tsx` | Package page components from `/react` |
| Styles | `src/app/globals.css` | `@import "@tgoliveira/secure-auth/styles.css"` |

**Not used:** `@tgoliveira/secure-auth/server`, `createRoutes`, `createAuthServices`.

### UI provider wiring

The starter passes `secureAuth.uiConfig` from the composition root into the client provider:

```tsx
// src/app/layout.tsx
<Providers uiConfig={secureAuth.uiConfig}>{children}</Providers>
```

UI defaults (`paths`, `messages`, `passwordPolicy`, `passwordStrength`) are defined in `createSecureAuth({ ui: { ... } })` in `src/lib/secure-auth.ts`. Password feedback renders above fields by default.

---

## Local development (monorepo)

From repository root:

```bash
npm install
npm run build -w @tgoliveira/secure-auth
cp .env.example apps/starter/.env.local
docker compose up -d
npm run db:migrate
npm run dev
```

Open `NEXTAUTH_URL` from env (typically http://localhost:3001).

### Required environment

See [docs/configuration-reference.md](../../docs/configuration-reference.md) and [`.env.example`](../../.env.example) (or [apps/starter/.env.example](./.env.example)). Minimum:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` / `APP_BASE_URL`
- `TWO_FACTOR_SECRET_ENCRYPTION_KEY`
- `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`
- `EMAIL_PROVIDER` (`console` or `smtp`)

### OAuth (optional)

Set provider client ID/secret. Redirect URIs: `{APP_BASE_URL}/api/auth/callback/{provider}`.

| Provider | Local dev notes |
| --- | --- |
| Google | Supports localhost redirect URIs |
| Microsoft | Supports localhost redirect URIs |
| Apple | Usually requires HTTPS and a real or tunneled domain |

### Passkeys

`WEBAUTHN_ORIGIN` must match the browser URL. Use `localhost`, not `127.0.0.1`.

### Email providers

| Environment | Recommended |
| --- | --- |
| Local | `EMAIL_PROVIDER=console` or Mailpit SMTP |
| CI | Console provider or test double |
| Production | SMTP or transactional email service |

---

## Commands

```bash
npm run dev -w @secure-auth/starter
npm run test -w @secure-auth/starter
npm run build -w @secure-auth/starter
npm run typecheck -w @secure-auth/starter
```

---

## Validation

Use [docs/consumer-validation-checklist.md](../../docs/consumer-validation-checklist.md) when verifying a new consumer integration.

| Check | Status (starter) |
| --- | --- |
| Package tests | Pass |
| Starter tests | Pass |
| build / typecheck | Pass |

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Package not built | `npm run build -w @tgoliveira/secure-auth` |
| DB connection refused | `docker compose up -d`; verify `DATABASE_URL` port |
| No verification email | `EMAIL_PROVIDER=console` logs links to terminal |
| SMTP / Mailpit | `EMAIL_PROVIDER=smtp`, open http://localhost:8025 |
| OAuth Configuration error | Restart dev server after env changes |
| UI unstyled | Import `@tgoliveira/secure-auth/styles.css` in `globals.css`; restart dev |
| Passkeys fail | Match `WEBAUTHN_ORIGIN` to browser URL exactly |
| Wrong page copy/paths | Verify `SecureAuthUIProvider` receives `secureAuth.uiConfig` |

See also [consumer-quick-start.md](../../docs/consumer-quick-start.md#14-verify-installation).
