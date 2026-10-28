# Development and deployment

## Daily workflow

1. Start from updated `main` and create a feature branch. Use the existing checkout.
2. Run `npm ci` on Node 24, develop with `npm run dev`, then run `npm run typecheck`, `npm test`, and `npm run build`.
3. Push the feature branch and create a pull request. Codex can use `gh pr create --draft --base main --head <branch> --title <title> --body-file <file>` when API access and authorization are available.
4. GitHub Actions runs `CI / TypeScript, tests and build` on every PR, on pushes to main, and on manual dispatch. It caches npm downloads keyed by the lockfile; installation still uses `npm ci`. New PR commits cancel superseded checks. No secrets are required, and the workflow has read-only repository access. Fork contributions may need a maintainer to approve the first workflow run under GitHub's security policy.
5. Review the existing Netlify site's Deploy Preview, including mobile/tablet/desktop layouts, keyboard navigation, and direct collection URL refreshes. Passing tests is not visual design approval.
6. A human reviews and merges after checks and design review. Netlify's Git integration then builds and deploys main to the existing site's production destination. Do not enable automatic merging.

GitHub CI validates; Netlify deploys. There is no deployment Action, Netlify CLI dependency, deploy hook, or deployment token in this repository.

## Required GitHub settings (repository administrator)

- Enable GitHub Actions for this repository and permit `actions/checkout` and `actions/setup-node` under the organization/repository Actions policy.
- Add a main-branch ruleset or branch protection requiring pull requests, at least one human approving review, dismissal of stale approvals, and the `TypeScript, tests and build` status check (select its actual CI run in the settings after the first run). Require branches to be up to date if appropriate for the team. Apply the rule to administrators and remove bypass permissions if approval must be mandatory for everyone.
- Keep “Allow auto-merge” disabled. Do not grant the CI workflow write permissions or enable Actions PR creation for this workflow; it does not create PRs.
- Review required checks for the existing Netlify integration after its first preview. GitHub protections gate merging; Netlify's push deployment does not inherently wait for the separate Actions run. Required PR checks are the normal gate, and direct pushes to main should be prohibited.

Repository files cannot enforce these account settings. They were not changed by this implementation.

## Existing Netlify site settings (site administrator)

Use only the existing site connected to `Vudthichai/vudi-phothisuk-art`. Confirm its GitHub App has access to this repository and that builds are active/unlocked:

- Repository base directory: repository root.
- Production branch: `main`; automatic Git deployments enabled.
- Build command: `npm run build`; publish directory: `dist`; Node: `24` (all defined in `netlify.toml`).
- Deploy Previews: enable for pull requests through the GitHub integration, subject to the site's permissions and contributor approval policy. Approve untrusted builds only after reviewing their code. Draft PR preview behavior depends on Netlify settings; if a draft receives no preview, mark it ready for review when appropriate.
- Branch deploys are optional and unnecessary for this pipeline. Do not create a second site or add a parallel GitHub deployment workflow.

The existing `/*` → `/index.html` status-200 rewrite supports client-side collection routes. Verify a deployed `/collections/forest-and-flowers` URL directly and after refresh. Unknown routes display the React not-found screen with HTTP 200.

After the first human-approved merge, verify the Netlify deploy references the merged main commit and succeeds. Actual Netlify connection, preview generation, production-branch settings and deployment success cannot be inferred from repository configuration alone; no Netlify account access was available for this change. Do not alter domain assignments, DNS, Squarespace, or D-NAV settings. If the site's current destination is unclear, verify it before enabling production builds.

## Codex permissions and GitHub API troubleshooting

Two independent prerequisites are required:

1. **Cloud network:** permit HTTPS to `api.github.com` for REST/GraphQL through the managed proxy. Keep GitHub/Git proxy destinations allowed for clone/fetch/push. The onboarding draft already requested `api.github.com`; it must be saved/applied in environment settings (and published as the platform requires). A saved draft alone does not change the running policy.
2. **GitHub authorization:** the Codex GitHub connection/app must be installed for this repository and approved by the organization where applicable. For a GitHub App or fine-grained token used by a supported CLI binding, the repository permissions needed are Metadata: read, Contents: read/write for branch pushes, and Pull requests: read/write for PR creation. Modifying `.github/workflows/` additionally requires Workflows: write. Organization approval/SSO and user access must permit the operation. Use the platform connection first; never put credentials in source files or chat. A classic PAT fallback requires `repo` for private repositories (or `public_repo` for public-only work) and `workflow` for workflow changes; prefer narrower app/fine-grained access.

The CI job's read-only `GITHUB_TOKEN` is separate from Codex's authentication. Increasing workflow permissions does not repair Codex access. Git proxy push access also does not prove GitHub API authorization.

Observed on 2026-10-28: fetch/read access worked; an unauthenticated HTTPS request to `https://api.github.com/` failed at proxy CONNECT with HTTP 403 (`server: envoy`), before a TLS connection to GitHub. The running enforced network policy omitted `api.github.com`. This identifies a cloud network restriction for the current failure; it does not establish that the GitHub credential is valid or invalid. Earlier `gh auth status` output describing an invalid token is inconclusive while the API is blocked. Never inspect or print the injected token to diagnose this.

After applying the network change, retry `gh api repos/Vudthichai/vudi-phothisuk-art` and PR creation. If the request reaches GitHub, distinguish a GitHub 401 (missing/invalid authentication), GitHub 403 (permission, policy, SSO or rate-limit denial; inspect the safe error message), and 404 (missing resource or deliberately hidden unauthorized repository). Verify app repository selection and the permissions above before requesting any new credential. Retest after each actual configuration change.
