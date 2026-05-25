# Audit Cadence

What to re-run periodically so the repo doesn't drift from the state 22+ rounds of audit work landed it in. None of these run automatically — they're operator-driven on the schedule below.

## Quarterly (recommended)

Pick one day per quarter (the first Monday after end-of-quarter, e.g.) and walk this list. Allow ~90 minutes.

### Step 1 — Dependency / CVE scan

```bash
.venv/bin/pip-audit -r requirements-dev.txt
npm audit
```

Both should return zero. If `pip-audit` reports CVEs, check whether the pinned versions are still safe (the CVE fix may already be in our pin) or whether the pin needs to bump.

### Step 2 — Doc-vs-spec drift (WebFetch against Anthropic docs)

Three URLs that have been the most fertile in prior audit rounds. Open `claude` and ask it to WebFetch each one and cross-check against our current config:

| URL | What to cross-check |
|---|---|
| <https://code.claude.com/docs/en/hooks> | Hook event names in `.claude/settings.json` — verify every event we use is still active |
| <https://code.claude.com/docs/en/mcp> | `.mcp.json` shape — verify stdio entry shape hasn't been deprecated |
| <https://code.claude.com/docs/en/permissions> | `permissions` block in `.claude/settings.json` — check for newly documented hardening keys |
| <https://code.claude.com/docs/en/skills> | Slash-command frontmatter — check for newly documented fields beyond `description` and `argument-hint` |
| <https://code.claude.com/docs/en/settings> | Top-level `settings.json` keys — anything new worth setting? |

Rounds 24, 25, 26, 29 each shipped a fix surfaced by one of these fetches. Reasonable to expect one or two findings per quarter as Anthropic evolves the spec.

### Step 3 — GitHub-side state snapshot

Refresh the state captured in `docs/github-repo-audit.md`:

```bash
gh api repos/jra2s394/cs-repo --jq '{visibility, default_branch, archived, security_and_analysis, delete_branch_on_merge, allow_merge_commit}'
gh api repos/jra2s394/cs-repo/branches/main/protection
gh api repos/jra2s394/cs-repo/branches/main/protection/required_pull_request_reviews
gh api 'repos/jra2s394/cs-repo/branches' --jq '.[].name' | grep -v '^main$' | wc -l   # should be 0
gh api repos/jra2s394/cs-repo/dependabot/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/code-scanning/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/secret-scanning/alerts
```

If any value diverges from `docs/github-repo-audit.md`, update the doc.

### Step 4 — Local hygiene

```bash
# Verify local install isn't carrying stale CVE-vulnerable packages
.venv/bin/pip list --outdated

# Apply retention to local outputs
bash scripts/cleanup-data-outputs.sh --apply

# Re-run the full test + lint matrix
make test && make lint

# Confirm pre-commit hooks still fire (was installed in round-30)
.venv/bin/pre-commit run --all-files
```

### Step 5 — Doc accuracy spot check

Pick three random commits from the last quarter (`git log --since='3 months ago' --pretty=oneline | shuf -n 3`) and verify that any doc claims in their PR descriptions are still true on `main`. Test-count drift is the most common finding.

## Monthly (lighter touch)

- `bash scripts/cleanup-data-outputs.sh --apply` — retention enforcement
- `make test` — confirm CI is still mirror of local
- Skim the [Dependabot PRs](https://github.com/jra2s394/cs-repo/pulls?q=is%3Apr+label%3Adependencies) and merge / dismiss

## On-demand (event-triggered)

| Trigger | Action |
|---|---|
| A new teammate joins | Walk them through `TEAM_SETUP.md` end-to-end. Note what was unclear. Fix the doc. |
| Anthropic releases a new Claude Code version with new hook events / settings keys | Re-run Step 2 above (just the relevant doc URL) |
| A new MCP server is added to `.mcp.json` | Audit it against the four-question test in `/check-setup` (Step 2) and add it to the data-handling appendix in SECURITY.md |
| A teammate leaves | Update `CODEOWNERS`. Rotate any tokens they had access to. Audit `~/.claude/tool-audit.log` for recent activity. |
| A CVE is published against a pinned dep | Bump the pin. Re-run Step 1. |

## Annually

- Review `LICENSE` — still appropriate?
- Review `CODEOWNERS` — still reflects the team?
- Review `SECURITY.md` retention policy — still 30 days?
- Review managed-settings deployment (if used) — still aligned with org policy?
- Review `pyproject.toml::requires-python` — bump if a Python version reaches end-of-life

## Detection record

These audit rounds produced the cadence above. If you ever wonder "why is this checklist on this schedule?", the answer is mostly "rounds 24/25/26/29 and the 40-series each found one drift per round when run quarterly."

| Round | Finding | Source |
|---|---|---|
| 24 | `.mcp.json` shape doc was wrong | WebFetch /en/mcp |
| 25 | `statusMessage` + `timeout` missing from 53 hook configs | claude-code-guide subagent |
| 26 | `argument-hint` frontmatter missing from 44 commands | WebFetch /en/skills |
| 27 | Python 3.10+ requirement undeclared | pip-audit failure |
| 29 | `disableBypassPermissionsMode` not set; pre-commit `detect-private-key` false-positive | WebFetch /en/permissions + `pre-commit run` |
| 40 | No Python type checking despite 13 hook files; one real bug (untyped Counter local) | manual scout for static-analysis gaps |
| 41 | `PostToolUseFailure` hook unwired (failed tool calls vanished from audit log); `autoUpdatesChannel` defaulted to `latest` instead of `stable` | WebFetch /en/hooks + /en/settings |
| 42 | `--cov-fail-under` unset (coverage could silently decay between rounds) | internal scout — pytest config drift |
| 43 | `session-to-obsidian.py main()` 90+ lines untested; coverage floor stuck at 70 until orchestration was tested | round-42 carry-over (coverage report on `main`) |
