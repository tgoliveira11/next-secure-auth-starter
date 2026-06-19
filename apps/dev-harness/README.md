# dev-harness

**Internal development tool — not a consumer reference.**

This app is the integration harness used to develop and manually test
`@tgoliveira/secure-auth`. It includes features (Swagger UI, API docs page,
extra route groups) that a real consumer would never have.

**If you are integrating the package into your app, use `apps/consumer-demo`
as your reference — not this app.**

| Purpose | App |
|---|---|
| Developing the package | `apps/dev-harness` (this app) |
| Consumer integration reference | `apps/consumer-demo` |
| Smallest working integration | `docs/minimal-consumer-example.md` |
