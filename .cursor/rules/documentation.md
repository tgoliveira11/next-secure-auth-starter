# Cursor Rule — Documentation

Docs are part of the product. Update documentation in the **same change** as the implementation it describes.

## When architecture changes

Update:

- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/MODULE_BOUNDARIES.md](../../docs/MODULE_BOUNDARIES.md)
- [.cursor/rules/architecture.md](architecture.md) if rule behavior changes

Examples: new module, route model change, Auth.js integration change, dependency rule change.

## When security behavior changes

Update:

- [SECURITY.md](../../SECURITY.md)
- [.cursor/rules/security.md](security.md) if rule behavior changes

Examples: token lifetime, session policy, OAuth scopes, TOTP storage, rate-limit policy, deletion behavior.

## When environment variables change

Update:

- [README.md](../../README.md) (if user-facing)
- [docs/USAGE_GUIDE.md](../../docs/USAGE_GUIDE.md)
- `.env.example` (once Phase 1 begins)

## When routes or providers change

Update:

- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [docs/USAGE_GUIDE.md](../../docs/USAGE_GUIDE.md) if setup steps change
- [README.md](../../README.md) if getting-started steps change

## When testing strategy changes

Update:

- [docs/TESTING_STRATEGY.md](../../docs/TESTING_STRATEGY.md)
- [.cursor/rules/testing.md](testing.md)

## When implementation phase or scope changes

Update:

- [docs/IMPLEMENTATION_ROADMAP.md](../../docs/IMPLEMENTATION_ROADMAP.md)
- [README.md](../../README.md) status section

## Agent instructions

Update [AGENTS.md](../../AGENTS.md) when agent workflow, stop conditions, or non-negotiable rules change.

## Do not

- Leave docs stale after a behavioral change.
- Document product-specific vault or letter functionality.
- Lower documented coverage thresholds without explicit architectural review.
