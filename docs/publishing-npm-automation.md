# npm automated publishing (GitHub Actions + Trusted Publishing)

**Package:** `@tgoliveira/secure-auth`  
**Registry:** [npm public registry](https://www.npmjs.com/package/@tgoliveira/secure-auth)  
**npm dist-tag:** `internal` (install with `@tgoliveira/secure-auth@internal` or an explicit version)  
**License:** MIT — see [LICENSE](../LICENSE) in the repository and the published package tarball.

This monorepo publishes `@tgoliveira/secure-auth` automatically when a release tag is pushed. **No long-lived npm token** and **no `NPM_TOKEN` GitHub secret** are used — authentication uses **npm Trusted Publishing (OIDC)**.

---

## Release tag pattern

Push an annotated tag matching:

```text
secure-auth-v0.1.*-internal
```

Examples:

- `secure-auth-v0.1.9-internal`
- `secure-auth-v0.1.10-internal`

The tag suffix (after `secure-auth-v`) must match `packages/secure-auth/package.json` `version` exactly.

---

## Workflow

| Item | Value |
| --- | --- |
| File | [`.github/workflows/publish-secure-auth.yml`](../.github/workflows/publish-secure-auth.yml) |
| Trigger | `push` of tags `secure-auth-v0.1.*-internal` |
| GitHub repo owner | `tgoliveira11` |
| GitHub repo name | `next-secure-auth-starter` |
| Node.js | 22 LTS (stable on `ubuntu-latest` runners) |
| npm publish tag | `internal` |

### What the workflow does

1. Checks out the repository
2. Sets up Node.js with `registry-url: https://registry.npmjs.org/` (OIDC for Trusted Publishing)
3. Runs `npm ci`
4. Verifies package version matches the git tag
5. Builds `@tgoliveira/secure-auth`
6. Runs `typecheck`, `lint`, and `test`
7. Runs `npm pack --dry-run`
8. Publishes with `npm publish --access public --tag internal`

### Permissions

```yaml
permissions:
  contents: read
  id-token: write
```

`id-token: write` is required so GitHub Actions can mint an OIDC token for npm Trusted Publishing.

---

## npm Trusted Publisher setup (required once)

Configure this in the **npm** website for `@tgoliveira/secure-auth`:

1. Open [npm package settings](https://www.npmjs.com/package/@tgoliveira/secure-auth) → **Publishing access** → **Trusted publishers** (or **Provenance** / **Trusted Publishing**).
2. Add a **GitHub Actions** trusted publisher:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository owner | `tgoliveira11` |
| Repository name | `next-secure-auth-starter` |
| Workflow filename | `publish-secure-auth.yml` |
| Environment | *(leave empty unless you add a GitHub Environment)* |

3. Save.

If Trusted Publisher is **not** configured, the workflow will fail at **Publish to npm** with an authentication or provenance error.

**Do not:**

- Create or commit npm auth tokens
- Add an `NPM_TOKEN` repository secret for this workflow
- Store `NPM_TOKEN` in `.npmrc` in the repo

---

## Maintainer release checklist

1. Bump `packages/secure-auth/package.json` version (and aligned monorepo references — see [CHANGELOG.md](../CHANGELOG.md)).
2. Update `CHANGELOG.md` with a new `[x.y.z-internal]` section.
3. Commit and push to `main`.
4. Create and push an annotated tag:

```bash
git tag -a secure-auth-v0.1.9-internal -m "Release secure-auth v0.1.9-internal"
git push origin secure-auth-v0.1.9-internal
```

5. Watch the workflow: [GitHub Actions](https://github.com/tgoliveira11/next-secure-auth-starter/actions)
6. Verify on npm: [@tgoliveira/secure-auth](https://www.npmjs.com/package/@tgoliveira/secure-auth)

---

## Consumer install

```bash
npm install @tgoliveira/secure-auth@internal
# or pin a version:
npm install @tgoliveira/secure-auth@0.1.9-internal
```

Peer dependencies (`next`, `next-auth`, `react`, `react-dom`, `drizzle-orm`) must be installed in the consumer app. See [consumer-quick-start.md](./consumer-quick-start.md).

---

## Related documentation

- [publishing-private-package.md](./publishing-private-package.md) — legacy GitHub Packages notes (superseded for public npm)
- [consumer-quick-start.md](./consumer-quick-start.md) — integration walkthrough
- [configuration-reference.md](./configuration-reference.md) — env and config mapping
