# Documentation audit

**Date:** 2026-06-12  
**Scope:** Package-first architecture cleanup — final state

**Current version:** `0.1.2-internal`  
**Composition root:** `createSecureAuth(config)` from `@tgoliveira/secure-auth/next`  
**UI defaults:** `secureAuth.uiConfig` → `SecureAuthUIProvider`

---

## Summary

| Action | Count |
| --- | --- |
| Kept | 15 |
| Updated | 15 |
| Merged | 4 |
| Deleted | 18 |

---

## Files kept

| File | Role |
| --- | --- |
| `README.md` | Monorepo overview, local dev, doc index |
| `AGENTS.md` | AI agent instructions (package-first phase) |
| `CHANGELOG.md` | Release history |
| `packages/secure-auth/README.md` | Package overview |
| `apps/starter/README.md` | Reference consumer |
| `docs/architecture.md` | Package-first model, composition root, UI provider, boundaries |
| `docs/security.md` | Security requirements and readiness |
| `docs/package-api.md` | Public exports, routes, `uiConfig` |
| `docs/consumer-quick-start.md` | Consumer onboarding |
| `docs/minimal-consumer-example.md` | Smallest integration |
| `docs/customization.md` | UI, email, auth customization |
| `docs/migrations.md` | Database migrations and package upgrades |
| `docs/publishing-private-package.md` | GitHub Packages |
| `docs/consumer-validation-checklist.md` | Integration sign-off |
| `docs/documentation-audit.md` | This audit |
| `.cursor/rules/*.md` | Cursor agent rules (4 files) |

---

## Files updated

| File | Changes |
| --- | --- |
| `README.md` | Package-first framing; `SecureAuthUIProvider`; removed obsolete doc links |
| `AGENTS.md` | Package-first phase; removed Phase 0 no-code rule; updated doc map |
| `CHANGELOG.md` | Unreleased entry for UI provider, DI, documentation cleanup |
| `packages/secure-auth/README.md` | `uiConfig`, `SecureAuthUIProvider`; no global runtime |
| `apps/starter/README.md` | UI provider wiring; email/OAuth tables |
| `docs/architecture.md` | Full rewrite: package-first, UI config flow, constructor DI, merged boundaries |
| `docs/security.md` | **New** — merged security principles and readiness |
| `docs/package-api.md` | `uiConfig`, `SecureAuthUIProvider`; removed scoped-runtime section |
| `docs/consumer-quick-start.md` | UI provider section; production checklist from USAGE_GUIDE |
| `docs/minimal-consumer-example.md` | Providers + layout with `uiConfig` |
| `docs/customization.md` | UI config flow via provider |
| `docs/migrations.md` | Upgrade section; security doc reference |
| `docs/consumer-validation-checklist.md` | `SecureAuthUIProvider` checks |
| `.cursor/rules/documentation.md` | Points to `docs/` canonical paths |
| `.cursor/rules/architecture.md` | Package-first model |
| `.cursor/rules/security.md` | Points to `docs/security.md` |
| `.cursor/rules/testing.md` | Removed TESTING_STRATEGY reference; inline guidance |

---

## Files merged

| Source(s) | Into | Content preserved |
| --- | --- | --- |
| `SECURITY.md` | `docs/security.md` | Security principles, token/session/TOTP/OAuth rules, coverage |
| `docs/security-hardening.md` | `docs/security.md` | OAuth deletion policy, production gate, secret rotation (no phase logs) |
| `docs/MODULE_BOUNDARIES.md` | `docs/architecture.md` | Dependency rules, server/client separation |
| `docs/USAGE_GUIDE.md` | `docs/consumer-quick-start.md` | Production checklist, OAuth/email provider notes (via starter README) |

---

## Files deleted

| File | Why obsolete |
| --- | --- |
| `ARCHITECTURE.md` | Starter-first modular monolith; superseded by `docs/architecture.md` |
| `SECURITY.md` | Duplicate root copy; merged into `docs/security.md` |
| `docs/PACKAGE_HARDENING_REPORT.md` | Transitional hardening phase report |
| `docs/phase-7-route-migration.md` | Phase log — route migration complete |
| `docs/starter-module-dedup-candidates.md` | Phase log — deduplication complete |
| `docs/migration-from-starter.md` | Historical extraction/migration narrative |
| `docs/EXTRACTION_NOTES.md` | Extraction phase notes |
| `docs/repository-readiness.md` | One-time pre-push audit |
| `docs/IMPLEMENTATION_ROADMAP.md` | Phase 0–10 roadmap — implementation complete |
| `docs/USAGE_GUIDE.md` | Starter-template usage; merged into consumer docs |
| `docs/PRODUCT_PURPOSE.md` | Scope covered in README and architecture |
| `docs/security-hardening.md` | Tracker merged into `docs/security.md` |
| `docs/MODULE_BOUNDARIES.md` | Merged into `docs/architecture.md` |
| `docs/TESTING_STRATEGY.md` | Requirements inlined in `docs/security.md` and `.cursor/rules/testing.md` |
| `docs/git-release-strategy.md` | Transitional release planning doc |
| `apps/starter/src/modules/README.md` | Referenced deleted MODULE_BOUNDARIES |
| `packages/secure-auth/src/modules/README.md` | Internal readme referenced obsolete docs |

---

## Final documentation map

| When you need… | Read |
| --- | --- |
| Start integrating the package | [consumer-quick-start.md](./consumer-quick-start.md) |
| Smallest working example | [minimal-consumer-example.md](./minimal-consumer-example.md) |
| Sign off an integration | [consumer-validation-checklist.md](./consumer-validation-checklist.md) |
| Public API and routes | [package-api.md](./package-api.md) |
| Architecture and boundaries | [architecture.md](./architecture.md) |
| Customize UI, email, auth | [customization.md](./customization.md) |
| Security requirements | [security.md](./security.md) |
| Database migrations / upgrades | [migrations.md](./migrations.md) |
| Install from GitHub Packages | [publishing-private-package.md](./publishing-private-package.md) |
| Monorepo local dev | [README.md](../README.md) |
| Package-specific overview | [packages/secure-auth/README.md](../packages/secure-auth/README.md) |
| Reference consumer | [apps/starter/README.md](../apps/starter/README.md) |
| Release history | [CHANGELOG.md](../CHANGELOG.md) |
| AI agent rules | [AGENTS.md](../AGENTS.md) |

---

## Canonical paths (for agents)

- Architecture → `docs/architecture.md` (not root `ARCHITECTURE.md`)
- Security → `docs/security.md` (not root `SECURITY.md`)
- Consumer setup → `docs/consumer-quick-start.md` (not `docs/USAGE_GUIDE.md`)
- Module boundaries → `docs/architecture.md#module-boundaries` (not `docs/MODULE_BOUNDARIES.md`)

No phase logs or migration history docs remain in the active documentation set.
