# Documentation audit (hardening phase)

**Date:** 2026-06-11 (updated: consumer onboarding pass)

## Consumer onboarding pass (2026-06-11)

Added:

- [consumer-quick-start.md](./consumer-quick-start.md)
- [minimal-consumer-example.md](./minimal-consumer-example.md)
- [consumer-validation-checklist.md](./consumer-validation-checklist.md)

Updated all docs to remove obsolete `@tgoliveira/secure-auth/server`, `createRoutes`, and `createAuthServices` **as consumer-facing APIs**. Historical references remain only in CHANGELOG, hardening audit, and git-release tag history.

**Current version:** `0.1.1-internal` · **Composition root:** `createSecureAuth(config)` from `@tgoliveira/secure-auth/next`

## Summary (initial hardening)

| Action | Count |
| --- | --- |
| Files reviewed | 28 |
| Updated | 12 |
| Removed | 1 |
| Merged (by reference) | 2 |
| Current, no change | 13 |

## Files reviewed

### A. Current and accurate (no change required)

| File | Notes |
| --- | --- |
| `AGENTS.md` | Agent rules; `TODO_SECURITY_REVIEW_REQUIRED` remains as process marker only |
| `docs/PRODUCT_PURPOSE.md` | Scope and non-goals |
| `docs/MODULE_BOUNDARIES.md` | Import boundaries |
| `docs/migrations.md` | DB migration strategy |
| `docs/package-api.md` | Public exports |
| `docs/publishing-private-package.md` | GitHub Packages |
| `docs/phase-7-route-migration.md` | Historical route migration record |
| `docs/starter-module-dedup-candidates.md` | Phase 10 complete |
| `docs/customization.md` | UI/email customization |
| `.cursor/rules/*.md` | Cursor agent rules |
| `packages/secure-auth/src/modules/README.md` | Internal package modules |
| `apps/starter/src/modules/README.md` | Starter email adapter only |

### B. Updated

| File | Changes |
| --- | --- |
| `README.md` | Full Local Development Quick Start |
| `apps/starter/README.md` | Onboarding, troubleshooting |
| `packages/secure-auth/README.md` | EmailProvider contract, DI note |
| `docs/architecture.md` | DI runtime, email abstraction |
| `docs/security-hardening.md` | OAuth deletion resolved, review pass, validation |
| `docs/migration-from-starter.md` | Phase 10 references |
| `docs/TESTING_STRATEGY.md` | Integration test opt-in |
| `SECURITY.md` | OAuth deletion pointer |
| `ARCHITECTURE.md` | Legacy pointer to `docs/architecture.md` |

### C. Removed

| File | Reason |
| --- | --- |
| `STARTER_CONTEXT_PROMPT.md` | Obsolete Phase 0 bootstrap prompt |

### D. Merged / superseded (kept with pointer)

| File | Superseded by |
| --- | --- |
| `ARCHITECTURE.md` | `docs/architecture.md` |
| `docs/IMPLEMENTATION_ROADMAP.md` | Monorepo extraction complete; historical reference |
| `docs/EXTRACTION_NOTES.md` | `docs/migration-from-starter.md` |

### E. Outstanding gaps

| Gap | Recommendation |
| --- | --- |
| OAuth provider E2E in CI | Manual checklist in `apps/starter/README.md`; optional Playwright in 0.2.x |
| Video walkthrough | Not in scope |
| `docs/USAGE_GUIDE.md` | Overlaps README; consolidate in 0.2.x |

## Path / reference cleanup

- Removed references to deleted `apps/starter/src/server/*` shims
- Removed references to duplicated starter `modules/{auth,account,...}`
- Package email transport docs point to starter adapter
- OAuth deletion docs point to package `account-deletion-policy.ts`
