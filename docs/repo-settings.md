# GitHub repository settings

Settings below live in GitHub — not in git. Apply with the GitHub UI or `gh` CLI as a repository admin.

**Repository:** `tgoliveira11/next-secure-auth-starter`

## Branch protection — `main`

| Rule | Value |
| --- | --- |
| Require pull request | Yes |
| Required status checks | `validate`, `branch-name` (strict / up to date) |
| Require linear history | Yes |
| Allow force pushes | No |
| Allow deletions | No |
| Lock branch | Off (normal PR merges and tag creation remain allowed) |

### Apply with `gh` (admin)

```bash
gh api repos/tgoliveira11/next-secure-auth-starter/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate", "branch-name"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false
}
EOF
```

Adjust `required_approving_review_count` if you want mandatory human review.

### Release metadata respects branch protection

Release metadata is prepared on a release branch and merged through a normal pull request. `publish-secure-auth.yml` does not push commits to `main` and needs no branch-protection bypass. It writes only the post-publication `secure-auth-v*` tag and GitHub Release.

## Environment — `npmjs`

| Rule | Recommended value |
| --- | --- |
| Required reviewers | None (owner dispatches manually) — add reviewers if you want a second human gate |
| Deployment branches | `main` only |
| Secrets | Prefer OIDC Trusted Publishing; legacy `NPM_TOKEN` only during migration |

### Create / update environment

```bash
gh api repos/tgoliveira11/next-secure-auth-starter/environments/npmjs \
  --method PUT \
  --input - <<'EOF'
{
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
EOF
```

## npm Trusted Publisher

Configure at [npmjs.com](https://www.npmjs.com/) → package **@tgoliveira/secure-auth** → **Publishing access** → **GitHub Actions**:

| Field | Value |
| --- | --- |
| Repository | `tgoliveira11/next-secure-auth-starter` |
| Workflow file | `publish-secure-auth.yml` |
| Environment | `npmjs` |

Details: [publishing-npm-automation.md](./publishing-npm-automation.md).

## Verify settings

```bash
gh api repos/tgoliveira11/next-secure-auth-starter/branches/main/protection --jq '.required_status_checks,.required_linear_history,.allow_force_pushes'
gh api repos/tgoliveira11/next-secure-auth-starter/environments/npmjs
```

## Optional (not configured by default)

- **CODEOWNERS** — automatic review routing
- **Required reviewers** on `npmjs` environment
- **Rulesets** — alternative to classic branch protection (preserve the release-metadata PR requirement)
