# Consumer migration: passkey capability boundaries

Guidance for downstream apps that share the `passkey_credentials` table with non-account WebAuthn credentials (for example vault unlock passkeys).

## What changed

- **Account passkey list** (`GET /api/account/passkeys`) returns capability metadata for each credential: `signInEnabled`, `vaultUnlockEnabled`, `capabilities`, `removableFromAccountSettings`, `label`, `description`, and `badge`.
- **Account passkey UI** (`PasskeySettings`) is capability-aware. Non-auth credentials may appear for transparency but do not show a remove button.
- **Account passkey delete** (`DELETE /api/account/passkeys/:id`) rejects credentials that are not removable from account settings (HTTP 409). UI-only hiding is not sufficient.
- **Schema** adds `vault_unlock_enabled` on `passkey_credentials` (default `false`). Account registration sets `sign_in_enabled: true` and `vault_unlock_enabled: false`.
- **Account passkey registration** (`POST /api/account/passkeys/register`, `action: "options"`) builds WebAuthn `excludeCredentials` from **sign-in credentials only** (`signInEnabled === true`). Vault-only credentials do not block account passkey registration.

## Capability flags

| Flag | Meaning |
| --- | --- |
| `signInEnabled` | Credential may be used for account passkey login and is considered when preventing duplicate account sign-in registration |
| `vaultUnlockEnabled` | Credential is used for vault unlock (or another non-auth feature) in the consumer app |

The package does **not** silently upgrade a vault-only credential to account sign-in. Enabling sign-in on an existing vault passkey requires a separate explicit capability-upgrade flow (future work).

## Capability rules

| Credential | Account remove allowed |
| --- | --- |
| `signInEnabled: true`, `vaultUnlockEnabled: false` | Yes |
| `signInEnabled: false`, `vaultUnlockEnabled: true` | No — vault unlock only |
| `signInEnabled: false`, `vaultUnlockEnabled: false` | No — not an account passkey |
| `signInEnabled: true`, `vaultUnlockEnabled: true` | No — also used for vault unlock; disable vault unlock first |

Passkey **login** continues to allow only `signInEnabled: true` credentials.

Account passkey **registration** excludes only existing `signInEnabled: true` credentials from WebAuthn `excludeCredentials`. Vault-only credentials (`signInEnabled: false`, `vaultUnlockEnabled: true`) do not block adding an account sign-in passkey.

**Platform note:** Some authenticators may still refuse to create a second passkey for the same site on the same device. That is a WebAuthn/platform limitation, not a package exclusion bug. Users may need another authenticator or a future capability-upgrade flow to use the same physical passkey for both vault unlock and account sign-in.

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
- [ ] Vault-only passkey does not appear in account registration `excludeCredentials`
- [ ] User can add account sign-in passkey when only vault-only passkeys exist (on a different authenticator, or same device when platform allows)

## Related docs

- [passkey-registration-capability-boundary-audit.md](./passkey-registration-capability-boundary-audit.md) — registration exclude investigation and fix
- [package-api.md](./package-api.md) — account passkey API fields
- [security.md](./security.md) — passkey capability boundaries
