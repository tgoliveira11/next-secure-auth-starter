# Starter modules

Phase 10 deduplication removed duplicated auth/account/security modules from this app.

## What remains

| Path | Purpose |
| --- | --- |
| `email/core/` | App-owned SMTP/console delivery (`send-email`, `smtp-provider`, `config`) |
| `email/templates/` | App-branded account email copy |

All other auth behavior is provided by `@tgoliveira/secure-auth` via official exports.
