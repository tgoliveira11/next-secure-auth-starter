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
| Lock branch | **Off** — publish workflow must push release metadata |

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

### Why `Lock branch` stays off

`publish-secure-auth.yml` commits `Release x.y.z` to `main` via `github-actions[bot]` after manual dispatch. A locked branch would block that push.

Grant the bot bypass via **Rules → Bypass list** → `github-actions[bot]`, or ensure `GITHUB_TOKEN` has permission to push protected branches (Settings → Actions → Workflow permissions → read and write).

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
- **Rulesets** — alternative to classic branch protection (ensure bot bypass for publish workflow)
