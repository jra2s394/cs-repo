# GitHub Repo Audit

Status of the GitHub-side security and quality settings for `jra2s394/cs-repo`. These are configured in the GitHub web UI (not in committed files), so they don't show up in code reviews. This doc snapshots them so a drift gets noticed.

To refresh, run:

```bash
gh api repos/jra2s394/cs-repo --jq '{visibility, default_branch, archived, security_and_analysis}'
gh api repos/jra2s394/cs-repo/dependabot/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/code-scanning/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/secret-scanning/alerts 2>&1 | head -1
```

The repo-level settings live at <https://github.com/jra2s394/cs-repo/settings/security_analysis>.

---

## Current state (refreshed round-37, 2026-05-25)

| Setting | State | Notes |
|---|---|---|
| `visibility` | `public` | Documented in [SECURITY.md](../SECURITY.md) |
| `default_branch` | `main` | Branch protection rules live separately (see CLAUDE.md Git Workflow section) |
| `secret_scanning` | **enabled** ✓ | Catches provider patterns at push time |
| `secret_scanning_push_protection` | **enabled** ✓ | Blocks the push, not just alerts |
| `secret_scanning_validity_checks` | disabled | Off by choice — actively probing leaked tokens has its own risks |
| `secret_scanning_non_provider_patterns` | disabled | Optional; see gap #1 below |
| `dependabot_security_updates` | **enabled** ✓ (flipped round-37) | Opens a PR automatically when a CVE lands against a pinned dep |
| Code scanning (CodeQL) | **enabled** ✓ (flipped round-37; default config — no committed workflow file) | First scan completed; 1 alert dispositioned, see "CodeQL alert disposition" below |
| Open Dependabot alerts | 0 | API returns `[]` |
| Open secret-scanning alerts | 0 | API returns `[]` |
| Open code-scanning alerts | 1 dispositioned as "won't fix — by design" | See disposition below |

---

## CodeQL alert disposition (round-37)

| # | Severity | File | Rule | Decision |
|---|---|---|---|---|
| 1 | high (`error`) | `hooks/secret-scan.py:164` | `py/clear-text-logging-sensitive-data` | **Won't fix — by design**. The hook prints a truncated fragment of a matched secret to stderr so the user can (a) verify a false-positive (recognize a test fixture like `AKIA00000…FAKE`) and (b) disambiguate when multiple same-type tokens appear in one diff. The stderr stream goes to the user's own terminal — the user already has the full secret locally (they were about to commit it), so there's no exposure beyond what they already have. Round-37 also tightened the truncation from `first-8 + last-4` (12 chars exposed) to `first-4 + last-2` (6 chars exposed) as belt-and-suspenders. Inline comment at `hooks/secret-scan.py:124-134` documents the rationale for the next reviewer / scanner. Dismissed in the GitHub UI with this disposition link. |

If a future CodeQL scan re-flags the same line: the disposition stands. If it flags a *different* line: judge afresh.

---

## Gaps

### Gap #1 — Non-provider secret patterns are off

`secret_scanning_non_provider_patterns: disabled`. The repo's own `hooks/secret-scan.py` catches the Shortcut token pattern (`sct_*_*`) that GitHub doesn't ship as a provider pattern. Enabling non-provider patterns lets you author the same kind of custom patterns at the GitHub layer too — useful if you want a second line of defense even when a contributor doesn't have the local hooks installed.

**Fix (optional):** GitHub web UI → repo Settings → Code security → "Secret scanning" → enable "Non-provider patterns", then declare the same patterns from `hooks/secret-scan.py::SECRET_PATTERNS`.

**Tradeoff:** Custom pattern definitions live in repo settings (not as committed code), so they drift independently. Most defensible if your team is comfortable maintaining both surfaces.

---

## Branch protection rules on `main`

Pulled live via `gh api repos/jra2s394/cs-repo/branches/main/protection` (and the `/required_pull_request_reviews` sub-endpoint, which doesn't roll up into the parent response).

| Rule | API key | State |
|---|---|---|
| Require pull request before merging | `required_pull_request_reviews` (sub-endpoint) | ✅ on |
| Required approving reviews | `required_approving_review_count` | 1 |
| Status checks must pass | `required_status_checks.contexts` | `["test (3.10)", "test (3.11)", "test (3.12)"]` |
| Strict status checks (branch up-to-date with base) | `required_status_checks.strict` | ✅ true |
| Allow force pushes | `allow_force_pushes.enabled` | ❌ false |
| Allow branch deletion | `allow_deletions.enabled` | ❌ false |
| Require linear history | `required_linear_history.enabled` | ✅ true |
| Enforce for admins | `enforce_admins.enabled` | ❌ false (escape hatch retained — repo owner can bypass the 1-approval rule for solo work) |
| Required signatures | `required_signatures.enabled` | ❌ false |
| Required conversation resolution | `required_conversation_resolution.enabled` | ❌ false |
| Lock branch | `lock_branch.enabled` | ❌ false |
| Rulesets (modern alternative) | `/rulesets` | none defined (`[]`) |

This matches the table in [CLAUDE.md § GitHub branch protection rules](../CLAUDE.md), which is the user-facing reference.

> **Required-check / CI-matrix coupling gotcha** — the required-status-check names in branch protection must match the **expanded matrix job names** that GitHub Actions produces, not the workflow's job key. When `.github/workflows/test.yml` uses `strategy.matrix.python-version: ["3.10", "3.11", "3.12"]`, GitHub publishes the per-job statuses as `test (3.10)`, `test (3.11)`, `test (3.12)` — there is no plain `test` status anymore. If branch protection still requires a `test` check, the PR will appear mergeable even though the required check never ran. Round-35 (this round) caught this after round-32 introduced the matrix without updating branch protection; the fix was a single `gh api PATCH` to `required_status_checks.contexts`.

## Other GitHub-side state

- **Releases:** 0 (no tagged releases — repo treats `main` as continuous deployment for internal use)
- **Actions cache:** ~2.5 GB / 10 GB used across 49 caches (room to grow; well under the limit)
- **Open feature branches:** 0 after round-23 cleanup (was 27 before)

## Merge / branch settings

| Setting | API key | State | Notes |
|---|---|---|---|
| Delete branch on merge | `delete_branch_on_merge` | ✅ **true** (flipped 2026-05-25, round-23) | Was `false` from repo bootstrap — 27 merged feature branches accumulated through round-22 and were cleaned up in the same round |
| Allow squash merge | `allow_squash_merge` | true | Required — the standard merge mode |
| Allow merge commit | `allow_merge_commit` | true | Cosmetic only — `required_linear_history: true` (branch protection) rejects merge commits at PR-merge time, so this just leaves the UI option visible. Defensible to flip to `false` to remove the dead-option UI inconsistency |
| Allow rebase merge | `allow_rebase_merge` | true | Compatible with linear history; alternate path to squash |
| Allow auto-merge | `allow_auto_merge` | true | Useful for routine Dependabot bumps |

To verify after future settings drift:

```bash
gh api repos/jra2s394/cs-repo --jq '{delete_branch_on_merge, allow_squash_merge, allow_merge_commit, allow_rebase_merge, allow_auto_merge}'
gh api 'repos/jra2s394/cs-repo/branches' --jq '.[].name' | grep -v '^main$' | wc -l
```

The branches command should print `0` on a clean state. Cleanup pattern if drift happens:

```bash
gh api 'repos/jra2s394/cs-repo/branches' --jq '.[].name' | grep -v '^main$' | while read b; do
  gh api -X DELETE "repos/jra2s394/cs-repo/git/refs/heads/${b}"
done
```

## Hook event names (verified via WebFetch)

Round-23 cross-checked the hook event types used in `.claude/settings.json` against the current Anthropic docs (<https://code.claude.com/docs/en/hooks>). All 6 used events are current and active:

| Event we use | Current per docs | Notes |
|---|---|---|
| `PreToolUse` | ✓ | |
| `PostToolUse` | ✓ | |
| `PreCompact` | ✓ | Not deprecated despite the existence of `PostCompact` |
| `UserPromptSubmit` | ✓ | |
| `Notification` | ✓ | |
| `Stop` | ✓ | Not deprecated despite the existence of `SessionEnd` (the two are separate events) |

Available events we don't use yet (extension opportunities, not bugs): `SessionStart`, `SessionEnd`, `PostToolUseFailure`, `PostCompact`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `TaskCreated`, `TaskCompleted`, `SubagentStart`, `SubagentStop`.
- **Language mix (per GitHub):** JavaScript 184 KB, Python 151 KB, Shell 25 KB, PowerShell 2.5 KB, Makefile 1.2 KB

## What this doc does NOT cover

- Local hooks and lint config — `hooks/README.md` and `SECURITY.md` cover those.

Refresh this doc when any of the above changes, or at least once per significant audit pass.
