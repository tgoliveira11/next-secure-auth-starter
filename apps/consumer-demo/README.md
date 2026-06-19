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

## Keeping consumer-demo in sync

Route files in `src/app/api/` are automatically generated when the package adds
new routes. You should never need to create them manually.

**Automatic (GitHub Action):** When `create-routes.ts` changes on any branch,
the `sync-consumer-demo.yml` action generates missing files and commits them.

**Manual (local):**
```bash
npm run sync:consumer-demo
```

**Adding a new route to the package:**
1. Add the route to `create-routes.ts` as usual.
2. Add an entry to `scripts/consumer-demo-route-registry.mjs` with the route key,
   URL path, and HTTP methods.
3. Run `npm run sync:consumer-demo` — the route file is generated.
4. The CI test (`route-sync.test.ts`) will fail if step 2 or 3 is missing.

The registry (`scripts/consumer-demo-route-registry.mjs`) is the only file that
requires a human decision: it maps a route key to a URL path. Everything else
is mechanical.
