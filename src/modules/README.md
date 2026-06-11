# Internal Modules

This project uses an **internal modular monolith** per `docs/MODULE_BOUNDARIES.md`.

## Module list

Account and authentication modules only:

- `auth` — login, OAuth, passkey auth, Auth.js integration
- `account` — settings, verification, password flows, deletion
- `sessions` — active sessions and revocation
- `two-factor` — optional TOTP
- `passkeys` — WebAuthn account authentication
- `email` — provider abstraction and account email templates
- `audit` — audit events and sanitization
- `rate-limit` — rate limiting policies and adapters
- `security` — hashing, tokens, logging, env validation
- `ui` — domain-neutral UI primitives

Product-specific vault and letter modules must not be added to this starter.

See `docs/MODULE_BOUNDARIES.md` for forbidden dependencies.
