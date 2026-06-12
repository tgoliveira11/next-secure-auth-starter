# Package Hardening Report

Phase: **package-hardening / package-purity** (pre–second consumer)

Date: 2026-06-11

Package: `@tgoliveira/secure-auth@0.1.1-internal`

> **Historical note:** The first monorepo extraction shipped as `0.1.0-internal` (tag `secure-auth-v0.1.0-internal`). Current package version is `0.1.1-internal` (tag `secure-auth-v0.1.1-internal`).

## Summary

The package was refactored to behave like a clean, reusable internal product. Legacy route stubs, migration shims, direct `process.env` runtime reads, and unpublished artifact references were removed or replaced with explicit `createSecureAuth(config)` injection.

**Result:** A new consumer can install from the published tarball, import official exports, typecheck against `dist/`, and wire routes through `secureAuth.routes.*` without transitional behavior.

---

## Priority 1 — Legacy route exports

### Issues found

| Issue | Location | Severity |
| --- | --- | --- |
| `createRouteHandlers` with 501 `notImplemented` handlers | `src/server/routes/index.ts` | Critical |
| Duplicate route registration paths | `createRouteHandlers` vs `createRoutes` | High |
| Legacy route key aliases (`loginCompleteLegacy`, `verifyEmail`, etc.) | `create-routes.ts` | Medium |

### Resolutions

- **Deleted** `packages/secure-auth/src/server/routes/index.ts` (legacy 501 handlers).
- **Single authoritative consumer path:** `createSecureAuth(config)` → `secureAuth.routes.*`.
- **Internal wiring:** `createRoutes` / `createAuthServices` remain **internal** (not exported).
- **`@tgoliveira/secure-auth/server`:** export path **removed** in `0.1.1-internal`.

---

## Priority 2 — Transitional shims

### Issues found

| Issue | Count / scope |
| --- | --- |
| `@deprecated` re-export shims under `src/server/*`, `src/lib/*`, UI | ~88 files |
| Deleted transitional modules | `auth-config-store`, `db-context`, `init-runtime`, `brand.ts` shim |
| Deprecated `authOptions` proxy | `auth-options.ts` |
| Tests mocking removed `@/lib/auth/session` | 8 route test files |
| Broken `sessions/server.ts` re-exports | `session-ip`, `user-agent-metadata` paths |

### Resolutions

- Ran `scripts/remove-shims.mjs` and `scripts/fix-imports.mjs` to rewire imports to canonical `src/modules/*` paths.
- Removed deprecated proxies and dead compatibility layers.
- Fixed test mocks to target `@/modules/auth/lib/session`.
- Fixed `sessions/server.ts` to re-export from `modules/security/ip/session-ip` and `modules/security/user-agent/metadata`.

---

## Priority 3 — Package `process.env` dependencies

### Issues found (runtime — not allowed)

| Variable | Former usage |
| --- | --- |
| `NEXTAUTH_SECRET` | login tokens, IP/UA hashing, cookie crypto |
| `TWO_FACTOR_SECRET_ENCRYPTION_KEY` | TOTP secret encryption |
| `WEBAUTHN_*` | WebAuthn RP config |
| `PASSWORD_POLICY_*` | password policy resolver |
| `RATE_LIMIT_STORE` | rate limit adapter selection |
| `SESSION_*` / `NEXTAUTH_SESSION_MAX_AGE` | session TTL config |
| `EMAIL_VERIFICATION_*` | account policy defaults |

### Allowed (unchanged)

- Test-only reads in `src/test/integration/*` (`INTEGRATION_DATABASE_URL`)
- Consumer app boundary reads in `apps/starter/src/lib/secure-auth.ts` (maps env → config)

### Resolutions

- Extended `SecureAuthConfig` with `passwordPolicy`, `sessions`, `rateLimit`, `server.cookieSecure`, `debug.authTrace`.
- Added `src/core/config-resolvers.ts` and `src/core/app-brand.ts` for config-derived values.
- Migrated all package runtime modules to `getSecureAuthConfig()` / resolver helpers.
- Cookie names use `app.slug` via builders in `auth-cookie-names.ts`.
- Microsoft OAuth helpers (`describeMicrosoftProviderConfigIssue`, etc.) **require explicit `env` argument** — no default `process.env`.
- `modules/security/env/load-env.ts` remains **internal, not exported** (starter-owned).

---

## Priority 4 — Hidden runtime state

### Issues found

| Mechanism | Purpose |
| --- | --- |
| `activeRuntime` / `getSecureAuthDb()` | composition root after `createSecureAuth` |
| `db` Proxy in `src/lib/db/index.ts` | repository access |
| `cachedAuthOptions` in `auth-options.ts` | NextAuth options memoization |
| Rate limit adapter singleton | test + runtime adapter binding |

### Resolutions / accepted debt (0.1.x)

`createSecureAuth(config)` is the **single composition root**. It calls `initSecureAuthRuntime(config)` once.

Remaining internal state is **intentionally scoped**:

1. **`activeRuntime`** — bound exclusively by `createSecureAuth` / `initSecureAuthRuntime`. Not a public service locator; documented in package README.
2. **`db` Proxy** — repositories resolve DB through runtime until constructor injection lands in 0.2.x.
3. **`cachedAuthOptions`** — module-level memo for NextAuth handler factory; cleared only on process restart.
4. **Rate limit adapter** — resolved from `config.rateLimit.store`; tests use `setRateLimitAdapterForTests`.

Full repository constructor injection deferred to 0.2.x to avoid a large refactor without functional benefit in 0.1.x.

---

## Priority 5 — Export purity

### Changes

| Export path | Final state (`0.1.1-internal`) |
| --- | --- |
| `@tgoliveira/secure-auth/server` | **Removed** — do not import |
| `@tgoliveira/secure-auth/next` | **`createSecureAuth(config)`** — sole consumer entry |
| Root `@tgoliveira/secure-auth` | Types, `SECURE_AUTH_PACKAGE_VERSION`, `authSchema`, `safeLogger` |

### Breaking consumer changes

| Removed / changed | Replacement |
| --- | --- |
| `createRouteHandlers` | `createSecureAuth(config).routes.*` |
| `LOGIN_PENDING_TOKEN_COOKIE` constant | `buildLoginPendingTokenCookieName(appSlug)` |
| `TWO_FACTOR_LOGIN_CHALLENGE_COOKIE` constant | `buildTwoFactorLoginChallengeCookieName(appSlug)` |
| `BRAND_MARK_SVG` / `brandMarkDataUrl` | `buildBrandMarkSvg(name)` / `buildBrandMarkDataUrl(name)` |
| `getPasskeyLoginHint()` (no args) | `getPasskeyLoginHint(appSlug)` |
| Client cookie clear helpers | Server handlers only (not public client API) |

---

## Priority 6 — Published artifacts

### Issues found

- `styles.css` previously referenced `./src/modules/ui` (unpublished in tarball).

### Resolutions

- `styles.css` now contains only `@source "./dist/modules/ui";`.
- `package.json` `files`: `dist`, `migrations`, `styles.css`, `README.md`.
- `npm pack --dry-run` confirms no `src/` tree in tarball.

---

## Priority 7 — Installation simulation

Temporary consumer workspace created from `npm pack` tarball (outside monorepo).

| Check | Result |
| --- | --- |
| Install tarball + peer deps | Pass |
| Typecheck all public export paths | Pass (`tsc --noEmit`) |
| Tarball contains `dist/*`, `styles.css`, `migrations` | Pass |
| `styles.css` does not `@source` unpublished trees | Pass |
| Runtime import without `next-auth` installed | Expected failure — consumer must install NextAuth peer |

Validated imports (public entry points only):

- `@tgoliveira/secure-auth`, `/next`, `/react`, `/client`, `/client/password-policy`, `/email`, `/drizzle/schema`, `/styles.css`

**Not validated (unsupported):** `@tgoliveira/secure-auth/server`

Styles: import in app CSS (`@import "@tgoliveira/secure-auth/styles.css"`), not as a TypeScript module.

---

## Priority 8 — Documentation

Updated:

- `packages/secure-auth/README.md` — exports, config injection, runtime ownership
- `docs/package-api.md` — route table (all implemented), server exports
- `CHANGELOG.md` — hardening phase entry
- This report

---

## Final validation

| Command | Result |
| --- | --- |
| `npm install` | Pass |
| `npm run build -w @tgoliveira/secure-auth` | Pass |
| `npm run build` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass (7 warnings, 0 errors) |
| `npm run test -w @tgoliveira/secure-auth` | **141 passed**, 1 skipped |
| `npm run test -w @secure-auth/starter` | **212 passed** |
| `npm run db:migrate` | Pass |
| `npm pack` | Pass — tarball contains `dist/`, `migrations/`, `styles.css` only (no `src/`) |

---

## Acceptance criteria

| Criterion | Status |
| --- | --- |
| No legacy route exports | ✅ |
| No 501 route handlers | ✅ |
| No unnecessary migration shims | ✅ |
| Runtime config not from package `process.env` | ✅ |
| Hidden runtime state minimized and documented | ✅ |
| Exports intentional and audited | ✅ |
| Package artifacts contain no broken references | ✅ |
| Installation simulation succeeds (types + tarball) | ✅ |
| Documentation updated | ✅ |
| Validation commands pass | ✅ |
| Ready for brand-new consumer application | ✅ |

---

## Package-readiness follow-up (0.1.1-internal)

Additional changes to prepare for a brand-new consumer without open design questions:

| Decision | Implementation |
| --- | --- |
| `next-auth` peer + dev dependency | `peerDependencies` and `devDependencies` in `package.json` |
| Centralized health version | `SECURE_AUTH_PACKAGE_VERSION` in `src/core/package-version.ts`; health route + test |
| Remove internal APIs from public exports | `createAuthServices`, `createRoutes` removed from `@tgoliveira/secure-auth` and `@tgoliveira/secure-auth/server`; `./server` export path removed |
| Scoped runtime documented | `docs/architecture.md`, package README, security-hardening |
| Sourcemaps without embedded source | tsup `esbuildOptions.sourcesContent = false` |
| Docs at `0.1.1-internal` | README, package-api, publishing, phase-7, consumer onboarding docs |

---

## Consumer onboarding documentation (post-hardening)

| Document | Purpose |
| --- | --- |
| [consumer-quick-start.md](./consumer-quick-start.md) | Full new-app integration guide |
| [minimal-consumer-example.md](./minimal-consumer-example.md) | Smallest working example |
| [consumer-validation-checklist.md](./consumer-validation-checklist.md) | Sign-off checklist |
| [package-api.md](./package-api.md) | Supported / unsupported entry points |
