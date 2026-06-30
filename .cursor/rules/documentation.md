# Cursor Rule — Documentation

Docs are part of the product. Update documentation in the **same change** as the implementation it describes.

## When architecture changes

Update:

- [docs/architecture.md](../../docs/architecture.md)
- [.cursor/rules/architecture.md](architecture.md) if rule behavior changes
- [docs/package-api.md](../../docs/package-api.md) if public exports change

Examples: new module, route model change, `uiConfig` / `SecureAuthUIProvider` changes, dependency rule change.

## When security behavior changes

Update:

- [docs/security.md](../../docs/security.md)
- [.cursor/rules/security.md](security.md) if rule behavior changes

Examples: token lifetime, session policy, OAuth scopes, TOTP storage, rate-limit policy, deletion behavior.

## When environment variables change

Update:

- [README.md](../../README.md) (if user-facing)
- [docs/consumer-quick-start.md](../../docs/consumer-quick-start.md)
- `.env.example`

## When routes, providers, or UI config change

Update:

- [docs/architecture.md](../../docs/architecture.md)
- [docs/package-api.md](../../docs/package-api.md)
- [docs/CURRENT_PRODUCT_SURFACE.md](../../docs/CURRENT_PRODUCT_SURFACE.md)
- [docs/consumer-quick-start.md](../../docs/consumer-quick-start.md) if setup steps change
- [docs/customization.md](../../docs/customization.md) if customization options change
- [README.md](../../README.md) if getting-started steps change

## When testing strategy changes

Update:

- [.cursor/rules/testing.md](testing.md)
- [docs/security.md](../../docs/security.md) if security test requirements change

## Agent instructions

Update [AGENTS.md](../../AGENTS.md) when agent workflow, stop conditions, or non-negotiable rules change.

## Do not

- Leave docs stale after a behavioral change.
- Document product-specific vault or letter functionality.
- Lower documented coverage thresholds without explicit architectural review.
- Preserve obsolete phase logs or migration history in active docs.
