# User preferences integration

Per-user, cross-device UI state (theme, layout, locale, etc.) via opt-in key-value storage.

**ADR:** [adr/user-preferences.md](./adr/user-preferences.md)

## Enable

1. Apply migration `0003_user_preferences.sql` from `@tgoliveira/secure-auth/migrations`.
2. Enable in config:

```typescript
createSecureAuth({
  // ...
  preferences: {
    enabled: true,
    maxKeysPerUser: 50,       // optional, default 50
    maxValueBytes: 4096,      // optional, default 4096
    allowedNamespaces: [],    // optional extras beyond app.slug
    defaults: { theme: "system" }, // optional seed for app.slug on first read
    defaultsByNamespace: {      // optional per-namespace seeds
      "my-widgets": { density: "compact" },
    },
  },
});
```

**Env (consumer-demo pattern):**

```bash
AUTH_USER_PREFERENCES_ENABLED=true
```

## Routes

Wire thin App Router handlers (see `scripts/consumer-demo-route-registry.mjs`):

| Handler key | Methods | Path |
| --- | --- | --- |
| `accountPreferences` | GET, PATCH | `/api/account/preferences` |
| `accountPreferencesByKey` | GET, PUT, DELETE | `/api/account/preferences/[key]` |
| `accountPreferencesExport` | GET | `/api/account/preferences/export` |

When `preferences.enabled` is `false`, routes return **404**.

### Responses

- **List/get** include `etags: Record<string, string>` (per key) for optimistic concurrency.
- **GET by key** also returns an `ETag` response header.
- **PUT/DELETE** accept optional `If-Match` header.
- **PATCH** accepts optional `{ ifMatch: Record<string, string> }` in the body.

Conflict → **412** when `If-Match` does not match the stored revision.

## Namespace

Default namespace is **`config.app.slug`**. Pass `?namespace=` to read/write another allowed namespace.

Reserved namespace **`secure-auth`** is read-only from account APIs (package UI keys). Consumers use `app.slug`.

## Client API

From `@tgoliveira/secure-auth/client`:

```typescript
import { preferencesApi } from "@tgoliveira/secure-auth/client";

await preferencesApi.set("theme", "dark");
const { entries, etags } = await preferencesApi.list();
await preferencesApi.patch({ theme: "dark" }, undefined, {
  ifMatch: { theme: etags.theme },
});
await preferencesApi.exportAll();
```

## React hooks

From `@tgoliveira/secure-auth/react/client` (requires `SecureAuthUIProvider` + `SessionProvider`):

```typescript
import {
  useUserPreferences,
  useUserPreference,
  mergeGuestPreferences,
  useMergeGuestPreferences,
} from "@tgoliveira/secure-auth/react/client";

function ThemeSettings() {
  const { value: theme, setValue } = useUserPreference("theme", "system");
  return (
    <select value={theme} onChange={(e) => void setValue(e.target.value)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
```

### Guest → server merge

Pre-login state typically lives in `localStorage`. After login (2FA complete when applicable), opt in:

```typescript
useMergeGuestPreferences({
  storageKey: "my-app:guest-ui",
  mapLocalToEntries: (local) => ({ theme: (local as { theme?: string }).theme ?? "system" }),
});
```

Default strategy: **`local-wins-if-server-empty`** — only keys missing on the server are patched.

See **`apps/consumer-demo`** for a working theme example (`UserPreferencesBootstrap`, `useGuestOrSyncedTheme`).

## Auth and security

- Requires fully authenticated session (2FA complete when applicable).
- Mutations require same-origin protection (consistent with other account APIs).
- Rate limited per user/IP.
- Values must be JSON-serializable and within `maxValueBytes`.
- Preference values are **not** logged.
- **Export** returns only the authenticated user's own preferences (GDPR self-export).

## Versioning (consumer-owned)

The package stores opaque JSON. For schema changes, use one of:

- `{ "version": 2, ... }` inside the value and migrate on read in your app.
- New key names (`theme.v2`) for breaking type changes.

## Distinction from other config

| Mechanism | Scope |
| --- | --- |
| `ui.cssVariables` | App-wide static theme from `createSecureAuth` |
| `profile` | Identity fields (`displayName`, `avatarUrl`, `bio`) |
| `preferences` | Extensible per-user UI/state |
| `localStorage` | Guest-only; merge after login with hooks above |
