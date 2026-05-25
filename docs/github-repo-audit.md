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

## Current state (round-19, 2026-05-25)

| Setting | State | Notes |
|---|---|---|
| `visibility` | `public` | Documented in [SECURITY.md](../SECURITY.md) |
| `default_branch` | `main` | Branch protection rules live separately (see CLAUDE.md Git Workflow section) |
| `secret_scanning` | **enabled** ✓ | Catches provider patterns at push time |
| `secret_scanning_push_protection` | **enabled** ✓ | Blocks the push, not just alerts |
| `secret_scanning_validity_checks` | disabled | Off by choice — actively probing leaked tokens has its own risks |
| `secret_scanning_non_provider_patterns` | disabled | Custom patterns; could enable if useful |
| `dependabot_security_updates` | **disabled** ⚠ | See gap #1 below |
| Code scanning (CodeQL) | **not set up** ⚠ | See gap #2 below |
| Dependabot alerts API | **disabled** ⚠ | Same root setting as `dependabot_security_updates` |
| Open Dependabot alerts | n/a | API returns 403 (alerts are disabled) |
| Open secret-scanning alerts | 0 | API returns `[]` |
| Open code-scanning alerts | n/a | API returns 404 (no analysis configured) |

---

## Gaps

### Gap #1 — Dependabot security updates are off

`.github/dependabot.yml` configures **weekly version-bump PRs** (minor/patch grouped). That's separate from Dependabot **security update PRs**, which open automatically when a CVE is published against a dependency the repo uses. The security-update toggle is currently off.

**Fix:** GitHub web UI → repo Settings → Code security → "Dependabot security updates" → **Enable**.

**Why it matters:** A repo handling customer-data automation patterns shouldn't rely on the maintainer noticing a CVE in (e.g.) `docx` or `matplotlib` weeks later. Security updates open a PR within hours of a CVE landing.

### Gap #2 — No code scanning

The `code-scanning/alerts` API returns 404 — no CodeQL or other analyzer is configured. For a Python + JavaScript repo, CodeQL would catch common bug classes (path traversal, regex DoS, etc.) the existing `ruff` + `biome` linters don't.

**Fix:** GitHub web UI → repo Settings → Code security → "Code scanning" → **Set up CodeQL analysis** (default config is fine for this repo's languages).

**Why it matters:** Today the repo relies on three layers: hook-level safety (push-guard, secret-scan, etc.), lint at `make lint`, and the `/review-code` checklist for human review. CodeQL adds a fourth layer that catches what the others can miss — usually security-relevant patterns.

### Gap #3 — Non-provider secret patterns are off

`secret_scanning_non_provider_patterns: disabled`. The repo's own `hooks/secret-scan.py` catches the Shortcut token pattern (`sct_*_*`) that GitHub doesn't ship as a provider pattern. Enabling non-provider patterns lets you author the same kind of custom patterns at the GitHub layer too — useful if you want a second line of defense even when a contributor doesn't have the local hooks installed.

**Fix (optional):** GitHub web UI → repo Settings → Code security → "Secret scanning" → enable "Non-provider patterns", then declare the same patterns from `hooks/secret-scan.py::SECRET_PATTERNS`.

**Tradeoff:** Custom pattern definitions live in repo settings (not as committed code), so they drift independently. Most defensible if your team is comfortable maintaining both surfaces.

---

## What this doc does NOT cover

- Branch protection rules — those are documented in [CLAUDE.md § Git Workflow](../CLAUDE.md). Refresh them with `gh api repos/jra2s394/cs-repo/branches/main/protection`.
- Local hooks and lint config — `hooks/README.md` and `SECURITY.md` cover those.

Refresh this doc when any of the above changes, or at least once per significant audit pass.
