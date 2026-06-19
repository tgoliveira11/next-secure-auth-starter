# Consumer migration: passkey capability boundaries

Guidance for downstream apps that share the `passkey_credentials` table with non-account WebAuthn credentials (for example vault unlock passkeys).

## What changed

- **Account passkey list** (`GET /api/account/passkeys`) returns capability metadata for each credential: `signInEnabled`, `vaultUnlockEnabled`, `capabilities`, `removableFromAccountSettings`, `label`, `description`, and `badge`.
- **Account passkey UI** (`PasskeySettings`) is capability-aware. Non-auth credentials may appear for transparency but do not show a remove button.
- **Account passkey delete** (`DELETE /api/account/passkeys/:id`) rejects credentials that are not removable from account settings (HTTP 409). UI-only hiding is not sufficient.
- **Schema** adds `vault_unlock_enabled` on `passkey_credentials` (default `false`). Account registration sets `sign_in_enabled: true` and `vault_unlock_enabled: false`.

## Capability rules

| Credential | Account remove allowed |
| --- | --- |
| `signInEnabled: true`, `vaultUnlockEnabled: false` | Yes |
| `signInEnabled: false`, `vaultUnlockEnabled: true` | No — vault unlock only |
| `signInEnabled: false`, `vaultUnlockEnabled: false` | No — not an account passkey |
| `signInEnabled: true`, `vaultUnlockEnabled: true` | No — also used for vault unlock; disable vault unlock first |

Passkey **login** continues to allow only `signInEnabled: true` credentials.

## What downstream apps should do

1. **Upgrade** `@tgoliveira/secure-auth` to the latest release (or `@latest`).
2. **Run migrations** so `vault_unlock_enabled` exists on `passkey_credentials`.
3. **Set flags when creating app-specific passkeys** — vault unlock credentials should use `signInEnabled: false` and `vaultUnlockEnabled: true` (and a clear `friendlyName`, for example `"Vault passkey"`).
4. **Use package passkey UI** or respect `removableFromAccountSettings` in custom UI — never show account remove for `signInEnabled: false`.
5. **Route vault passkey removal** through your vault settings flow; revoke envelopes and credentials there, not via account delete.
6. **Do not delete shared WebAuthn rows** from account APIs when they protect another feature.

The package does **not** own vault envelope tables. It fails closed: account delete will not revoke vault-only or dual-capability credentials.

## Validation checklist

- [ ] Vault-only passkey appears with **Vault unlock only** badge if listed
- [ ] No remove button for vault-only passkey in account settings
- [ ] Account sign-in passkey still shows remove and can be deleted
- [ ] `DELETE /api/account/passkeys/:id` returns 409 for vault-only credential
- [ ] Vault unlock still works after account settings changes
- [ ] No orphaned vault envelope after supported removal flows in your app
- [ ] Passkey login still rejects `signInEnabled: false` credentials

## Related docs

- [package-api.md](./package-api.md) — account passkey API fields
- [security.md](./security.md) — passkey capability boundaries
