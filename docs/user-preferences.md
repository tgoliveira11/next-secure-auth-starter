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

When `preferences.enabled` is `false`, routes return **404**.

## Namespace

Default namespace is **`config.app.slug`**. Pass `?namespace=` to read/write another allowed namespace.

Reserved namespace **`secure-auth`** is read-only from account APIs (package UI keys). Consumers use `app.slug`.

## Client API

From `@tgoliveira/secure-auth/client`:

```typescript
import { preferencesApi } from "@tgoliveira/secure-auth/client";

await preferencesApi.set("theme", "dark");
const { entries } = await preferencesApi.list();
await preferencesApi.patch({ theme: "dark", "layout.menuOpen": true });
await preferencesApi.delete("theme");
```

## Auth and security

- Requires fully authenticated session (2FA complete when applicable).
- Mutations require same-origin protection (consistent with other account APIs).
- Rate limited per user/IP.
- Values must be JSON-serializable and within `maxValueBytes`.
- Preference values are **not** logged.

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
| `localStorage` | Guest-only; use Phase B merge helper to sync after login |

## Phase B (not yet shipped)

React hooks (`useUserPreferences`, `mergeGuestPreferences`) — see ADR delivery phases.
