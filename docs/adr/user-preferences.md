# ADR: User preferences engine

**Status:** Accepted (implemented — Phase A in `0.6.0`; Phase B pending)  
**Date:** 2026-07-03  
**Target release:** `0.6.0` (core API); `0.6.x` (React merge helper + hooks)  
**Authors:** Product / architecture review

## Context

Consumers of `@tgoliveira/secure-auth` need to persist **per-user, cross-device** UI and UX
choices (theme, sidebar collapsed, locale, layout density, etc.) for authenticated users.

The package already provides:

| Mechanism | Scope | Gap |
| --- | --- | --- |
| `ui.cssVariables` / `SecureAuthUIProvider` | App-wide static theming from `createSecureAuth` | Not per-user |
| `profile.enabled` (`displayName`, `avatarUrl`, `bio`) | Public identity fields | Fixed schema, not extensible |
| Browser `localStorage` | Guest / pre-login state | No sync, no server |

A generic **user preferences** module fits the package mission: account-scoped storage with
the same patterns as sessions, profile, and 2FA (opt-in config, Drizzle schema, account
APIs, client entrypoint).

## Decision summary

| Topic | Decision |
| --- | --- |
| Default namespace | **`app.slug`** from `createSecureAuth` config (automatic) |
| Guest → user merge | **Opt-in helper** (`mergeGuestPreferences` / `useMergeGuestPreferences`) in `@tgoliveira/secure-auth/react/client` |
| Admin visibility | **No** — admins cannot read other users' preferences |
| Account deletion | **`ON DELETE CASCADE`** on `user_id` FK |
| Schema versioning | **Package does not opine** — consumer-owned; documentation only |

## Goals

- Generic key-value JSON storage per user, namespaced and size-bounded.
- Opt-in (`preferences.enabled`, default `false`) — no mandatory migration for existing apps.
- Account APIs require authenticated session (2FA complete when applicable).
- Client API + optional React hooks for consumers and package UI.
- Module boundaries: repository → service → route handlers; no DB in client components.

## Non-goals

- Guest/anonymous server-side preferences (pre-login stays consumer + `localStorage`).
- Storing secrets, tokens, credentials, or sensitive PII in preference values.
- Replacing `profile`, `admin_config_overrides`, or product feature flags.
- Admin UI or APIs to inspect user preferences.
- Package-side JSON schema versioning or migration utilities.
- Encrypted preference payloads or vault-related keys.

## Data model

### Table: `user_preferences`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | FK → `users.id`, **`ON DELETE CASCADE`** |
| `namespace` | `varchar(64)` | See namespaces below |
| `key` | `varchar(128)` | Consumer-defined key name |
| `value` | `jsonb` | JSON-serializable value |
| `updated_at` | `timestamptz` | Last write |

**Primary key:** `(user_id, namespace, key)`

**Index:** `(user_id, namespace)` for list queries.

### Namespaces

| Namespace | Owner | Purpose |
| --- | --- | --- |
| `{app.slug}` | Consumer (default) | App-specific prefs (`theme`, `layout.menuOpen`, …) |
| `secure-auth` | Package (reserved) | Optional well-known keys for package UI only |

Rules:

- Default read/write namespace = **`config.app.slug`** unless overridden per request.
- Consumers **must not** write to `secure-auth` except via documented package APIs/keys.
- Additional namespaces require `preferences.allowedNamespaces` (future strict mode) or
  remain rejected if not in allowlist.

### Relationship to other features

```text
createSecureAuth ui.cssVariables     →  deploy-time / app-wide theme defaults
profile (displayName, avatar, bio)   →  public identity
user_preferences                     →  private per-user UI/state (this ADR)
localStorage (guest)                 →  consumer-only, pre-login
```

## Configuration

```typescript
preferences?: {
  /** Default false — no table migration required when disabled. */
  enabled?: boolean;
  /** Max keys per user per namespace. Default: 50. */
  maxKeysPerUser?: number;
  /** Max serialized JSON bytes per value. Default: 4096. */
  maxValueBytes?: number;
  /** Extra allowed namespaces beyond app.slug. Default: [] */
  allowedNamespaces?: string[];
}
```

**Planned env (consumer apps):** `AUTH_USER_PREFERENCES_ENABLED=true` mapped in
`buildSecureAuthConfigFromEnv`.

## API surface (server)

Route prefix: `/api/auth/account/preferences` (account tier, same-origin on mutations).

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/` | List all keys in namespace (`?namespace=` optional, default `app.slug`) |
| `GET` | `/:key` | Single key |
| `PUT` | `/:key` | Upsert `{ value }` |
| `PATCH` | `/` | Partial merge `{ entries: Record<string, unknown> }` |
| `DELETE` | `/:key` | Remove key |

**Auth:** `requireVerifiedFullyAuthenticatedUser` (or equivalent account tier).

**Security:**

- Same-origin protection on mutating routes (consistent with account APIs).
- Rate limiting per user/IP.
- Reject non-JSON-serializable values, oversize payloads, disallowed namespaces.
- Do **not** log preference values.

**Route registry key (planned):** `accountPreferences` — sync to `consumer-demo` via
`scripts/consumer-demo-route-registry.mjs`.

## API surface (client)

**`@tgoliveira/secure-auth/client`** (planned):

```text
preferencesApi.list(namespace?)
preferencesApi.get(key, namespace?)
preferencesApi.set(key, value, namespace?)
preferencesApi.patch(entries, namespace?)
preferencesApi.delete(key, namespace?)
```

**`@tgoliveira/secure-auth/react/client`** (planned, phase B):

```text
useUserPreferences(namespace?)
useUserPreference(key, defaultValue, namespace?)
mergeGuestPreferences(options)
useMergeGuestPreferences(options)
```

## Guest → user merge (decision 11.2 — Option B)

Pre-login preferences typically live in `localStorage`. After login, consumers may want to
**seed the server** without overwriting existing cloud prefs.

### Helper: `mergeGuestPreferences`

Export from `@tgoliveira/secure-auth/react/client`. **Opt-in** — not automatic in
`SecureAuthUIProvider`.

```typescript
type MergeGuestPreferencesOptions = {
  /** localStorage key (consumer-defined). */
  storageKey: string;
  /** Optional custom reader; default JSON.parse(localStorage.getItem(storageKey)). */
  readLocal?: () => unknown;
  /** Maps local blob → flat preference entries. */
  mapLocalToEntries: (local: unknown) => Record<string, unknown>;
  /** Default: config app.slug from SecureAuthUIProvider context. */
  namespace?: string;
  /** Subset of keys to sync; default: all keys from mapLocalToEntries. */
  keys?: string[];
  /**
   * Default: "local-wins-if-server-empty"
   * - local-wins-if-server-empty: PATCH only keys missing on server
   * - local-wins-once: local overwrites server on first merge per user/session flag
   * - server-wins: no PATCH; local ignored after login
   */
  strategy?: "local-wins-if-server-empty" | "local-wins-once" | "server-wins";
};

type MergeResult = {
  merged: string[];
  skipped: string[];
  reason?: "already-merged" | "no-local-data" | "server-wins";
};
```

### Default strategy: `local-wins-if-server-empty`

1. Run when session is authenticated (and 2FA complete if pending).
2. `GET` server prefs for namespace.
3. For each local key: if **absent** on server → include in `PATCH`.
4. If key **exists** on server → skip (server wins).
5. Set idempotency flag (e.g. `sessionStorage` `secure-auth:prefs-merged:{userId}`) so merge
   runs once per browser session per user.

### Consumer responsibilities

- Shape of local JSON and mapping to keys.
- Applying theme/UI after merge (package does not set `data-theme` automatically).
- OAuth / 2FA timing — call helper after fully authenticated session.

## Schema versioning (decision 11.5 — Option 4)

The package stores **opaque JSON** with size limits only. **Versioning is consumer-owned.**

Documentation will recommend (not enforce):

- **Composite objects:** include `{ "version": 2, ... }` in the JSON value; migrate on read
  in consumer code.
- **Breaking type changes** (e.g. string → object): use a new key (`theme.v2`) or a one-off
  migration script.
- **Avoid** namespace-per-version (`my-app-v2`) except extreme cases — orphans old rows.

The package will **not** ship `parsePreferenceVersion`, migration helpers, or DB columns for
schema version.

## Well-known keys (package, optional)

Documented constants under namespace `secure-auth` for package UI only:

| Key | Type | Example use |
| --- | --- | --- |
| `ui.colorScheme` | `"light" \| "dark" \| "system"` | Consumer applies theme class |
| `ui.sidebarCollapsed` | `boolean` | Admin/settings shell layout |
| `ui.locale` | `string` (BCP-47) | Consumer i18n layer |

Package UI **may** read/write these when `preferences.enabled` and consumer opts in; no
hard dependency in phase A.

## Module layout (implementation)

```text
packages/secure-auth/src/modules/preferences/
  repositories/user-preferences-repository.ts
  services/user-preferences-service.ts
  lib/preference-limits.ts
  lib/well-known-keys.ts
packages/secure-auth/src/server/routes/handlers/account/user-preferences*.ts
packages/secure-auth/migrations/0003_user_preferences.sql
```

## Delivery phases

### Phase A — `0.6.0`

- SQL migration + Drizzle schema
- Service, repository, account routes
- `preferencesApi` on client entry
- `preferences.enabled` config + docs
- consumer-demo route sync (when implemented)
- Tests (service, handlers, limits); coverage ≥ 90%

### Phase B — `0.6.x`

- `mergeGuestPreferences` / `useMergeGuestPreferences`
- `useUserPreferences` / `useUserPreference` hooks
- consumer-demo example: theme + sidebar after login
- Integration guide: `docs/user-preferences.md`

### Phase C — backlog (not committed)

- Default prefs on first login (`preferences.defaults` in config)
- GDPR export bulk endpoint
- Optimistic concurrency (`ETag` / `If-Match`)

## Acceptance criteria

- [ ] With `preferences.enabled: true`, consumer persists and retrieves a key after login on
      a second device.
- [ ] Disallowed namespace returns 400/403.
- [ ] Value &gt; `maxValueBytes` rejected.
- [ ] With `preferences.enabled: false`, routes return 404 and no migration required for
      consumers who skip the feature.
- [ ] User delete cascades preference rows.
- [ ] `mergeGuestPreferences` with default strategy does not overwrite existing server keys.
- [ ] No admin route exposes another user's preferences.

## Documentation updates (on implementation)

- [docs/CURRENT_PRODUCT_SURFACE.md](../CURRENT_PRODUCT_SURFACE.md)
- [docs/configuration-reference.md](../configuration-reference.md)
- [docs/package-api.md](../package-api.md)
- [docs/user-preferences.md](../user-preferences.md) (integration guide)
- [CHANGELOG.md](../../CHANGELOG.md)
- [apps/consumer-demo/README.md](../../apps/consumer-demo/README.md) checklist

## References

- [CURRENT_PRODUCT_SURFACE.md](../CURRENT_PRODUCT_SURFACE.md) — planned inventory
- [architecture.md](../architecture.md) — module boundaries, composition root
- [security.md](../security.md) — account API hardening patterns
