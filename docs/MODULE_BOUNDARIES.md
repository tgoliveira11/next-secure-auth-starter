# Module Boundaries

## Goal

This document defines the internal module boundaries for `next-secure-auth-starter`.

The starter uses a modular monolith architecture. Boundaries exist to keep security-sensitive logic testable, server-only code out of the client bundle, and product-specific concerns out of reusable modules.

## Module list

```text
auth
account
sessions
two-factor
passkeys
email
audit
rate-limit
security
ui
```

## Dependency rules

Allowed dependency direction (higher modules may depend on lower/shared modules):

```text
app routes
    ↓
auth, account, sessions, two-factor, passkeys
    ↓
email, audit, rate-limit, security
    ↓
(infrastructure: Drizzle, Auth.js adapters — server only)

ui  ←  (no imports from domain modules)
```

### Forbidden dependencies

1. `ui` must not import account/auth server logic or database clients.
2. `security` must not import UI or app routes.
3. `email` must not import UI or app routes.
4. `audit` must not import UI or app routes.
5. `rate-limit` must not import UI or app routes.
6. No module may import product-specific vault or letter code (none should exist in this repo).

### Allowed cross-module dependencies

| Module | May depend on |
| --- | --- |
| `auth` | `security`, `audit`, `rate-limit`, `email`, `sessions`, `two-factor`, `passkeys` |
| `account` | `security`, `audit`, `rate-limit`, `email`, `sessions` |
| `sessions` | `security`, `audit`, `rate-limit` |
| `two-factor` | `security`, `audit`, `rate-limit` |
| `passkeys` | `security`, `audit`, `rate-limit` |
| `email` | `security` |
| `audit` | `security` |
| `rate-limit` | `security` |
| `security` | (no domain modules) |
| `ui` | (no domain modules; React/UI libs only) |

Modules must not import from another module's internal files when a public API exists.

## Server/client separation

Server-only code must not be imported by client components.

Client components must not import:

- database clients or Drizzle schemas
- repositories
- server-only auth handlers
- server-only secrets or env accessors
- Node-only modules (`fs`, `crypto` server paths, etc.)

Mark server-only entry points explicitly (e.g. `"server-only"` import or `*.server.ts` convention once Phase 1 begins).

## Public module APIs

Each module should expose a clear public API via an index file (e.g. `src/modules/security/index.ts`).

Prefer:

```ts
import { evaluatePasswordPolicy } from "@/modules/security";
```

Avoid deep imports unless documented:

```ts
// Avoid unless internal to the same module
import { hashToken } from "@/modules/security/internal/hash-token";
```

## Route file boundaries

Files under `src/app` may orchestrate modules but must not contain business logic.

Route files should:

- validate input
- call module services
- map errors to HTTP responses
- return responses

## Boundary tests

The project must include static boundary tests to prevent forbidden imports.

At minimum, verify:

- client components do not import DB clients or Drizzle
- `ui` primitives do not import domain modules
- `security`, `email`, `rate-limit`, and `audit` do not depend on `auth`, `account`, or app routes
- `auth` and `account` do not bypass module public APIs with deep imports

Boundary test failures block merge.

## When boundaries change

Update this document and [.cursor/rules/architecture.md](../.cursor/rules/architecture.md) in the same change that introduces a new module or dependency.
