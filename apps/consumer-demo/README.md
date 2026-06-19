# consumer-demo

**Canonical consumer reference for `@tgoliveira/secure-auth`.**

This app demonstrates the minimal correct integration of the package using
public exports only. It contains no custom features — only thin wrappers
over `secureAuth.routes.*` and the package's ready-to-use page components.

Use this app as your reference when integrating the package. Do not copy
from `apps/dev-harness` — that app contains internal tooling not intended
for consumers.

| Purpose | App |
|---|---|
| Consumer integration reference | `apps/consumer-demo` (this app) |
| Developing the package | `apps/dev-harness` |
| Smallest working integration | `docs/minimal-consumer-example.md` |

## Keeping this app up to date

Every time a new version of the package adds routes or config options,
`consumer-demo` must be updated to reflect them. The version checklist in
`docs/roadmap.md` enforces this.
