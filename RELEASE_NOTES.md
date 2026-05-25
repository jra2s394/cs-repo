# Release Notes

Chronological per-PR history of the bootstrap period. Each entry maps to a single merged PR. Entries are grouped by date and tagged by theme so you can scan for a class of change (e.g. `[command]`, `[safety]`, `[testing]`).

> **Scope:** PR #4 through PR #109 (2026-05-23 to 2026-05-25). Two phases of history live in this file: the v2.0 bootstrap (PR #4-#32, detailed entries below) and the v2.1 audit storm (PR #75-#109, summarized in the next section as rounds 10–39 with one-line + PR-link per round). Everything in between can be reached via `git log --oneline main` or the GitHub PR list. The "Numbers at a glance" table further down was a snapshot at PR #29; a "Today" column tracks the current totals so deltas stay legible.

**Tags:**
- `[command]` — new or modified slash command in `.claude/commands/`
- `[hook]` — change to a Claude Code hook in `hooks/`
- `[report]` — change to a report generator in `reports/` or its scaffolding
- `[testing]` — test infrastructure, new tests, CI
- `[lint]` — linter config or wiring
- `[safety]` — guardrails, permissions, secret-scanning, system action policy
- `[refactor]` — code restructuring with no behavior change
- `[content]` — slabstack-cs/ content (KB articles, QBR templates, etc.)
- `[docs]` — README/SETUP/USER_GUIDE/CONTRIBUTING/CLAUDE.md
- `[fix]` — bug fix
- `[infra]` — Makefile, package.json, requirements, scripts

---

## 2026-05-25 — v2.1: post-audit baseline (rounds 10–35, PR #75–#105)

After v2.0 the repo entered a 22-round audit storm. Each round was scoped to one finding or one cohesive cleanup, shipped as a single PR, reviewed against the PR template, and merged before the next started. The pattern produced 105 PRs in roughly two weeks. By the end: 7 real bugs fixed, 11 doc-accuracy drifts corrected, 8 future-proofing test families added (44 parametrized + 31 one-off cases), every hook wired into pre-commit + CI matrix, full GitHub community profile, formal data-handling appendix in SECURITY.md, managed-settings deployment template, retention enforcement script, and the entire repo generalized away from Mountain Time hardcoding so it forks cleanly for any time zone.

The round-by-round table below indexes the work for fast navigation. For full per-PR context, follow the `#NNN` link — every PR body documents its detection method, fix, test plan, and what was deliberately not changed.

| Round | PR | Tag | What landed |
|---:|---:|---|---|
| (pre-10) | #75 | `[fix]` | `kpiStrip` column-width corruption — `tblGrid` length mismatched cell count |
| (pre-10) | #76 | `[fix]` | `dateSlug()` silently dropped the month on natural-language dates (`May 25, 2026` → `25-2026`) |
| 10 | #77 | `[docs]` | Hook-doc accuracy drift in 3 places: Slack regex char class, `push-guard` missing `gh repo edit --visibility public`, `draft-before-create` coverage incorrectly bounded |
| 11 | #78 | `[fix]` | Windows desktop installer (`setup-desktop.ps1`) was creating only 3 of 6 report folders → silent no-op of `copyToDesktop` for QBR/Health/Executive reports |
| 12 | #79 | `[fix]` `[docs]` | `customer-search.md` + `check-setup.md` called Intercom `search_companies` which doesn't exist; `tasks.md` frontmatter promised completion behavior the body explicitly forbids |
| 13 | #80 | `[safety]` | 4 Shortcut subtask write ops (`stories-add-subtask`, `-create-subtask`, `-remove-subtask`, `-upload-file`) were bypassing `draft-before-create` |
| 14 | #81 | `[safety]` | 3 Asana project-create write ops (`create_project`, `_confirm`, `_confirm_populate`) were bypassing `draft-before-create` — including the one `/start-onboarding` uses |
| 15 | #82 | `[docs]` | Scrubbed 10 stale `dotclaude` brand references in `patterns/` + `examples/` that PR #65 missed |
| 16 | #83 | `[testing]` | 3 cross-file consistency test families — setup-desktop `.sh`/`.ps1` folder parity, `copyToDesktop` category coverage, every `reports/*.js columnWidths: [...]` sums to 9360 DXA |
| 17 | #84 | `[testing]` `[docs]` | `hooks/README.md` was missing entries for `branch-enforcer.py` and `secret-scan.py`; added them + a parity test that fails CI if either drifts again, plus a forbidden-terms test |
| 18 | #85 | `[docs]` | `RELEASE_NOTES.md` was lying about coverage ("every change merged to main" stopped at PR #32) — added Scope note + Today column to the Numbers table |
| 19 | #86 | `[testing]` `[docs]` | `make test-cov` was reporting 46% — hooks subprocess-tested don't trip `coverage.py`. Added `.coveragerc` that scopes to lib/. Plus new `docs/github-repo-audit.md` snapshotting GitHub-side state via `gh api` (surfaced: Dependabot security updates off, CodeQL not configured) |
| 20 | #87 | `[docs]` | `CLAUDE.md` branch-protection table said "Required approvals: 0" but API said 1; documented the live state + the `required_pull_request_reviews` sub-endpoint quirk |
| 21 | #88 | `[fix]` `[testing]` | `T.dataTable({ rows: d.optionalField })` crashed at 8 sites when the optional field was missing. Two-layer fix: defaulted `rows = []` in `lib/report-theme.js` + per-site `|| []` guards + 2 regression tests. Caught by a parallel Explore-agent audit |
| 22 | #89 | `[safety]` | `hooks/secret-scan.py::ALLOW_PATHS` used `startswith()` — would have allow-listed `hooks/secret-scan.py.bak` and bypassed the entire scanner |
| 23 | #90 | `[infra]` `[docs]` | `delete_branch_on_merge` was off — 27 merged feature branches accumulated. Enabled the setting, deleted all 27 (verified each via its PR's `merged_at`). Plus WebFetch-verified every hook event name we use against the live Anthropic docs |
| 24 | #91 | `[docs]` | `CLAUDE.md` MCP-config note described the wrong shape (`type`/`url`/`name`) — actual `.mcp.json` is stdio with `command`/`args`/`env`. WebFetch'd the canonical doc, rewrote |
| 25 | #92 | `[safety]` | `hooks/README.md` documented `statusMessage` + `timeout` on every hook as the canonical example; actual `.claude/settings.json` had neither on any of 53 entries. Added them all |
| 26 | #93 | `[testing]` `[docs]` | WebFetch'd the slash-commands doc, found `argument-hint` frontmatter we never set. Added to 6 high-value commands + parametrized format test across all 44 commands (+44 tests) |
| 27 | #94 | `[fix]` `[docs]` | `pip-audit` revealed `requirements-dev.txt` pinned versions (`pytest≥9.0.3`, `pillow≥12.2.0`) that needed Python ≥3.10 — wouldn't install on the macOS-default 3.9. Added `pyproject.toml` with `requires-python = ">=3.10"` + SETUP/CONTRIBUTING guidance |
| 28 | #95 | `[docs]` | Documented the project-local venv pattern in CONTRIBUTING after wiring it on this machine end-to-end (cleared 7 local CVEs) |
| 29 | #96 | `[safety]` | Pre-commit `detect-private-key` first-run flagged `tests/hooks/test_secret_scan.py`'s deliberate PEM fixtures (excluded). Plus added `permissions.disableBypassPermissionsMode: "disable"` to settings.json after WebFetch surfaced it |
| 30 | #97 | `[infra]` `[docs]` | Pre-commit was configured but never installed as a git hook. Wired locally + added CI step. Stale-doc cleanup in same round |
| 31 | #98 | `[content]` | All 5 slabstack-cs content findings from round-21 resolved (videos/ dir, support email confirmation, ROI calculator removed, `/follow-up` ref dropped from go-live checklist) |
| 32 | #99 | `[infra]` `[docs]` | Team-readiness Tier 1: CI matrix Python 3.10/3.11/3.12 + `.github/CODE_OF_CONDUCT.md` + `.github/SECURITY.md` pointer + CODEOWNERS scaffolded for team expansion + GH repo description + 7 topics live |
| 33 | #100 | `[docs]` `[infra]` | Team-readiness Tier 2: `examples/managed-settings.example.json` + `MANAGED_SETTINGS.md` deploy guide + `scripts/cleanup-data-outputs.sh` retention enforcement + SECURITY.md data-handling appendix + `docs/audit-cadence.md` formalizing quarterly/monthly/event-triggered review |
| (chore) | #101 | `[infra]` | Bumped `package.json` / `pyproject.toml` / `package-lock.json` version strings to `2.1.0` to match the v2.1 tag |
| 34 | #102 | `[command]` | `/daily` invoked on Monday now stops and suggests `/weekstart` instead of running the wrong format. Caught by the round-33 dogfood smoke test |
| 35a | #103 | `[command]` `[safety]` | `/setup` auto-detects IANA TZ via `readlink /etc/localtime`, writes structured `Time zone:` field to `~/.claude/CLAUDE.md`. `/check-setup` validates it parses via `ZoneInfo()` |
| 35c | #104 | `[docs]` | Branch-protection `required_status_checks.contexts` updated `["test"] → ["test (3.10)", "test (3.11)", "test (3.12)"]` (CI matrix from round-32 had renamed the check names but branch protection wasn't updated — PRs since round-32 had been merging without the gate actually firing) |
| 35b | #105 | `[refactor]` `[docs]` | 52-file scrub of hardcoded `Mountain Time` / `America/Denver` → per-user IANA field. Repo now forks cleanly for any time zone |
| 36 | #106 | `[docs]` `[testing]` | Extended this file with the rounds 10–35 audit summary; fixed stale `572` test count in USER_GUIDE.md to match the live 571; allow-listed `RELEASE_NOTES.md` in `tests/test_no_stale_terms.py` so the historical `dotclaude` mention here doesn't fail the dotclaude scrub guard |
| 37 | #107 | `[safety]` `[docs]` | Enabled CodeQL + Dependabot security updates (two-click via GitHub UI). First CodeQL scan flagged `hooks/secret-scan.py:164` for `py/clear-text-logging-sensitive-data` — tightened the snippet truncation from `first-8 + last-4` (12 chars exposed) to `first-4 + last-2` (6 chars), added a 10-line inline comment block explaining the threat model, and dispositioned the alert "won't fix — by design" with a link to the comment. `docs/github-repo-audit.md` refreshed: both gaps from round-19 closed, new "CodeQL alert disposition" section added |
| 38 | #108 | `[docs]` `[command]` | Enablement pack: three new docs (`docs/ARCHITECTURE.md` — command-execution flow + 3 archetypes + hook event ordering, `docs/TROUBLESHOOTING.md` — symptom-grouped recovery guide, `docs/COMMAND_GUIDE.md` — add-a-command runbook). Surfaced `ASANA_TEAM_GID` per-person config in the CLAUDE.md template + SETUP.md Step 4 + `/setup` Step 2.5 + `/check-setup` validator (🟡 when unset). Added a Day-1 → Week-4 cadence table to TEAM_SETUP.md so new teammates have rhythm beyond "ran one command on day 1" |
| 39 | #109 | `[fix]` `[docs]` | Three real issues caught by the post-#108 risk-mitigation pass (smoke-tested 17/17 report renderers, validated doc links, walked the `/setup` wizard chain). Fixed: (a) `/setup` Step 3 ↔ Step 4 contradiction for the skipped-GID case (Step 3 previewed `[unset]`, Step 4 said to leave the template placeholder); (b) `/check-setup` false-negative against legacy prose-format personal CLAUDE.md (added a `## Who I am` heading heuristic + single-🟡 migration prompt instead of per-field "missing" flood); (c) `docs/COMMAND_GUIDE.md` hallucinated a parity test reference (`tests/test_commands_readme_parity.py`) — softened to the truth |
| 40 | (this PR) | `[testing]` `[docs]` | Made the round-39 honesty good: added the parity test that backs the COMMAND_GUIDE.md claim (every `.claude/commands/*.md` appears in a CLAUDE.md table row; every CLAUDE.md `/cmd-name` table entry resolves to a real file); updated this RELEASE_NOTES to cover rounds 36–39 + this PR so the changelog matches `git log` |

### Numbers at a glance

| Metric | At v2.0 | At v2.1 |
|---|---|---|
| Slash commands | 44 | 44 (stable) |
| Hooks | 11 | 11 (stable) |
| Report generators | 17 | 17 (stable) |
| Python tests | 443 | 571 (+128) |
| JS tests | 129 | 157 (+28) |
| Pre-commit hook checks | 0 | 9 |
| CI steps | 4 | 6 (matrix x3 + ruff + biome + pre-commit + JS) |
| Required status checks | 1 stale | 3 (one per matrix entry) |
| Branch protection rules | 5 | 5 (one accuracy fix) |
| Known code bugs | 7 | **0** |
| Known doc-accuracy drifts | many | **0** |
| GitHub community health | ~50% | ~95% |
| Hardcoded `Mountain Time` / `America/Denver` references | 84 | 0 (intentional doc examples retained) |
| `pip-audit` against pinned deps | failed on Python 3.9 | clean |
| `npm audit` | clean | clean |

---

## 2026-05-24

### `<pending>` · PR #32 — Add `SECURITY.md`
**Tags:** `[docs]`

Net: 3 files changed, +N (1 new top-level doc, 1 README link, 1 RELEASE_NOTES entry).

Closes the one remaining low-hanging item from the original audit: a public repo handling customer data patterns shouldn't ship without a security policy. `SECURITY.md` covers:

- **Reporting channels:** GitHub private vulnerability reporting (preferred) or email
- **In-scope:** hooks, lib, reports, scripts, command prompts, hook bypass techniques, CI config
- **Out of scope:** third-party MCP servers, customer data in connected systems, forks, Claude Code itself
- **Existing safeguards inventoried:** `secret-scan.py`, `push-guard.py`, `file-protector.py`, `draft-before-create.py`, `block-attribution.py`, `permissions.deny` denylist, GitHub branch protection
- **Token leak response procedure:** rotate first, report second; git-history rewrite is not sufficient (assume compromised the moment it hit a remote)
- **What's gitignored** (and why): `.env*`, `.mcp.json`, `data/outputs/*`, `out/*.docx`, Finance sheets, personal `~/.claude/CLAUDE.md`
- **Customer PII clause:** runtime use is fine; commits are not — references the PR scrub checklist

README gains a "Reporting a security issue" section linking to SECURITY.md.

### `675a465` · PR #31 — Cross-reference 8 HIGH-priority commands to `/health-score` Step 1 gotchas
**Tags:** `[command] [docs]`

Net: 9 files changed, +9 (1 line added per command + a small RELEASE_NOTES entry).

Audit recap: PR #30 documented four MCP query patterns in `/health-score` that surfaced from live dogfooding (Asana team filter, Intercom `per_page`/`contact_ids` batching, recent-overdues sort trick, verbatim-quote rule). Eight other commands share the same query patterns and would hit the same failure modes the first time a teammate runs them.

This PR adds a one-line cross-reference block to those 8 commands, immediately after each intro paragraph, pointing teammates at `/health-score`'s Step 1 if any MCP query misbehaves. Same text in every file so future maintenance is one search-and-replace.

Commands cross-referenced (all HIGH-priority per the meta-audit):
- `/at-risk`, `/executive-summary`, `/renewal-health` (portfolio scans)
- `/customer`, `/qbr`, `/handoff` (per-customer deep-dives)
- `/expansion`, `/weekly-team` (aggregations)

Deliberately **not** done in this PR: speculative pattern-by-pattern enhancements (mode detection, batching technique, team filter) baked into each command. Those will land per-command, dogfood-driven, when each is next actually run against real data (same flow as `/health-score`). Speculative bulk edits risk wrong instructions; pointers to the documented fixes are zero-risk and high-value.

### `94101b1` · PR #30 — Enhance `/health-score` from dogfooding lessons
**Tags:** `[command] [docs]`

Net: 4 files changed, +N (1 command rewrite + 3 doc updates).

Battle-tested `/health-score` against the real portfolio (one full single-customer deep-dive + one portfolio scorecard across 30 active customers). Three live gaps surfaced that would otherwise show up as broken-looking commands for the next teammate. All three are now documented and structurally addressed in the skill prompt:

- **Single-customer mode added.** `/health-score <name>` now produces a focused per-customer snapshot (same rubric, one account, inline only — no `.docx`). Mode detection happens at Step 0; the portfolio path is unchanged. Useful before a customer call, a renewal, or any "is this account healthy?" check. The single-customer deep-dive proved the value; without this, teammates would get a portfolio report when they wanted a focused one.
- **Asana team filter now in the prompt.** Without it, an unfiltered `get_projects` returns projects from sibling product teams that pollute the scorecard. Skill now instructs to pass the team GID via the `[ASANA_TEAM_GID]` placeholder configured in your private CLAUDE.md, with the discovery method (grep a known project URL) documented.
- **Intercom batching technique documented.** `search_contacts(per_page=25)` returns ~3KB per contact and blows the token budget; `search_conversations(contact_ids=[...])` caps the array at 15 per call. Skill now tells the model to paginate contacts, strip down to IDs, and batch conversation queries by 15. Plus the portfolio-mode shortcut: one workspace-wide `state='open'` query and group client-side by sender domain (works well when total open volume is small, which it currently is).
- **Recent-overdues sort trick.** Naïve overdue queries return 2023 template tasks first; setting `due_on_after=~3 months ago` plus `sort_ascending=false` makes the first 100 results actionable.

Plus a rule refinement: customer signals must be direct quotes from email/Intercom/Read.ai — never paraphrased, never invented. Caught and codified after the live run made this discipline matter.

Docs sync:
- CLAUDE.md command table updated to describe both modes
- USER_GUIDE `/health-score` section expanded with the dual-mode description + the team-filter and batching transparency

### `fa753e9` · PR #29 — Team-readiness: `/check-setup`, TEAM_SETUP.md, Claude Code 101 + GitHub 101
**Tags:** `[command] [docs]`

Net: 7 files changed, +N (1 new command file, 1 new top-level doc, 4 doc updates, 1 checklist update).

The biggest gap before distributing to the team: a new teammate following SETUP.md would clone the canonical repo (blocked from pushing), miss the fork step entirely, and have no way to validate their setup actually worked. This PR closes that gap end-to-end.

- **New command:** `/check-setup` — read-only validator that probes everything a teammate could miscofigure: personal CLAUDE.md filled in with real values (not placeholders), all 7 MCPs respond to a no-op call (Gmail / Calendar / Drive / Asana / Intercom / Slack / Shortcut), the **Intercom Admin ID in CLAUDE.md actually matches the authenticated Intercom session** (silent mismatch was the highest-impact failure mode — `/daily` returns someone else's data and nobody notices), output dirs exist, dev tools installed (only 🟡 if missing, since command-only users don't need them). Per-MCP error isolation so one bad integration doesn't hide the others. Reports green/yellow/red per check with specific next-step fixes.
- **New top-level doc:** `TEAM_SETUP.md` — the canonical "teammate joining" path. Fork on github.com → clone YOUR fork → set upstream remote → follow SETUP.md from Step 2 → `/check-setup` → first command. Includes the update-flow (`git fetch upstream && git merge upstream/main`) and an "inviting a teammate" section for the repo owner.
- **USER_GUIDE Claude Code 101 section** — what Claude Code is, what slash commands are, what MCPs do, the approval flow, and what each of the 11 hooks blocks. Top of the guide, before the standup section. Non-technical teammates can read it cold.
- **USER_GUIDE GitHub 101 section** — what GitHub is, fork vs. clone (the difference and why it matters), your fork URL pattern, what a PR is, when to push vs. PR, how to pull team updates. Sits right after Claude Code 101.
- **Docs sync:**
  - README — two-path entry: TEAM_SETUP.md for teammates, SETUP.md for per-person config
  - SETUP.md — the "you're set up" step now ends with running `/check-setup` so a misconfiguration can't sneak past
  - CLAUDE.md — registered `/check-setup` in the Tooling table
  - USER_GUIDE — detailed `/check-setup` section + quick-reference entry
  - `/review-code` Section 20 — added `/check-setup` contract check (read-only, per-MCP error isolation)
- **Commands:** 43 → 44.

### `ab31af7` · PR #28 — Lock in the command frontmatter contract with a pytest
**Tags:** `[testing] [docs]`

Net: 5 files changed, +N (1 new test file + 4 docs).

- **New test:** `tests/test_commands_frontmatter.py` — 4 parametrized checks × every `.claude/commands/*.md` file: opening `---` block present and closed, non-empty `description:` field, description is ≥ 20 chars + no `TODO`/`TBD`/`WIP`/`placeholder`/`fixme` prefix + no trailing ellipsis, and the description is single-line (so it renders correctly in CLAUDE.md tables and `/commands` output). Plus 2 directory-level guards (commands dir exists, ≥ 1 command file present). Stress-tested all 5 failure modes — each produces a clear, actionable assertion message.
- **Net new tests:** 174 (4 checks × 43 commands + 2 directory checks). Python total: 265 → 439. Grand total: 394 → 568.
- **`/review-code` Section 20** — added an automated check that references `tests/test_commands_frontmatter.py`. The manual prose check ("does each command's description match what it does") remains for content drift; the new test catches structural drift automatically.
- **CONTRIBUTING.md** — added a paragraph documenting the frontmatter contract for command authors, plus the registration steps (CLAUDE.md table + USER_GUIDE quick-reference).
- **README + USER_GUIDE** — bumped test count 394 → 568 everywhere; expanded "Testing and quality" to mention the frontmatter contract.

The motivation: with 43 commands and growing, an unregistered or stub command in `.claude/commands/` was silently rotting the inventory `/commands` reads. Now CI rejects it.

### `2efd32e` · PR #27 — Add `/commands` and `/meeting-notes`
**Tags:** `[command] [docs]`

Net: 5 files changed, +N (docs + 2 new command files).

- **New command:** `/commands` — discoverability tool that lists every slash command live from `.claude/commands/*.md` frontmatter, grouped by category. Surfaces drift between the directory and CLAUDE.md (commands that exist in one but not the other), so the inventory can't silently rot. Read-only — no MCP calls.
- **New command:** `/meeting-notes` — read-only counterpart to `/follow-up`. Pulls Read.ai + calendar + Gmail + Asana + Shortcut for a meeting that just ended and produces a structured note (summary, decisions, action items cross-referenced against existing Asana tasks and Shortcut stories so you don't propose duplicates, customer signals quoted verbatim from the transcript, open-questions parking lot). No email drafted, no tasks created — strictly note-taking. Only side effect: optional save to `slabstack-cs/meeting-notes/<customer>-<date>.md`, and only after explicit "yes save".
- **CLAUDE.md** — added new "Tooling" command table covering `/setup`, `/commands`, `/review-code` (these were previously not listed in any table). Registered `/meeting-notes` in Customer intelligence.
- **README + USER_GUIDE** — detailed sections for both new commands; updated quick-reference table.

### `63c3b52` · PR #26 — Add `/inbox-triage` and hard-polish `/review-code`
**Tags:** `[command] [docs]`

Net: 6 files changed, +N (docs + 1 new command file + 4 new checklist sections).

- **New command:** `/inbox-triage` — morning Gmail triage that sorts overnight email into 🔴 Respond / 🟣 Escalate / 🟢 FYI / 🟡 Customer Signal buckets in under 60 seconds. Quotes the exact trigger phrase for customer signals (no inventing). Drafts replies only on request, never sends without per-draft approval. Defaults to `newer_than:1d -in:draft -category:promotions -category:social`.
- **`/review-code` hard polish** — closed 4 gaps that had accumulated since the checklist was first written:
  - New **Section 4b** for `secret-scan.py` (added in PR #23 but never got into the checklist) — verifies all 9 token patterns and the helpful-error-message contract.
  - **Section 10** gained 6 CSV-injection-defense items (leading `=`/`+`/`-`/`@`/tab prefix + the negative case that `x=1` mid-string stays untouched).
  - New **Section 19b** for `ruff.toml` config (E/F/B/UP rule selection, target-version match, test-dir per-file-ignores).
  - New **Section 20** for read-only / draft-first command contracts — verifies `/customer-search`, `/standup-recap`, `/inbox-triage`, `/at-risk`, `/prs` all state their contracts in prose, and that every command's frontmatter `description` field still matches what the command does (catches doc drift).
  - Section count in header bumped 19 → 22; CI parity check now includes `make lint-py`.
- **Docs sync:** README/USER_GUIDE updated for the new section count, the new command, and the new triage workflow. RELEASE_NOTES entry for this PR.
- **Standing rule:** Every new command from now on must update CLAUDE.md (table), README.md, USER_GUIDE.md (detailed section + quick reference), and add a RELEASE_NOTES entry. `/review-code` Section 20 catches frontmatter drift if descriptions go stale.

### `3dc9fad` · PR #25 — Add `/standup-recap`, clean up settings, refresh user docs, add `RELEASE_NOTES`
**Tags:** `[command] [safety] [docs]`

Net: 8 files changed, +352 / −47.

- **New command:** `/standup-recap` — aggregates the week's `data/outputs/daily-*.md` files into a deduplicated recap that feeds `/eow`. Read-only file aggregation, no MCP calls, no drafts.
- **Settings cleanup:** removed the 3 remaining redundant Shortcut delete matchers from `.claude/settings.json` (`stories-delete`, `epics-delete`, `iterations-delete`). All five delete operations are now gated by `permissions.deny` only — no dead matchers.
- **`/review-code` Section 8** updated to reflect the new architecture (delete operations are denied, not draft-gated) and added a check for matcher/deny overlap.
- **User-facing doc refresh:** corrected stale test count (258 → 394), section count (11 → 19), added `/customer-search` + `/standup-recap` to USER_GUIDE quick-reference table, expanded "Testing and quality" to cover ruff + biome, fixed Desktop folder list (now includes Health Reports and Executive Summaries).
- **Housekeeping:** deleted stale local `fix/code-review-findings` branch (fixes already in main, branch was 8.6K lines behind).
- **New file:** `RELEASE_NOTES.md` — comprehensive chronological history from origin through PR #24.

### `46e0bbd` · PR #24 — Add test coverage, refactor reports, add `/customer-search`
**Tags:** `[testing] [refactor] [command] [lint] [infra]`

Net: 41 files changed, +1,540 / −546.

- **New command:** `/customer-search` — fuzzy customer lookup across Asana, Shortcut, Intercom, and Gmail with an explicit 🟢/🟡/🔴 confidence rubric and customer-clustering logic. Read-only.
- **Test infrastructure:** added 122 new JS tests + 6 Python tests covering `hooks/notify.py`, `lib/report-theme.js` (incl. kpiWidths math for n=1–12), `lib/data-loader.js` (incl. new `dateSlug`), `lib/copy-to-desktop.js`, and a smoke harness for every report generator (3 contract checks × 17 reports). Total: 394 tests.
- **Linters:** added biome (JS) and ruff (Python) with minimal-config focus on real bugs (undeclared variables, unused imports, bare excepts, pyflakes/pyupgrade rules). Wired into `make lint`, `make lint-py`, `make lint-js`, and CI.
- **Reports refactor:** extracted `T.publishReport(doc, outFile, {category, label, csvSections})` and `dateSlug()` helpers; refactored all 17 reports to use them. Cuts ~280 LOC of duplicated boilerplate and structurally prevents the qbr.js bug class from recurring.
- **kpiWidths helper** extracted from the body of `kpiStrip` so the DXA-width math is directly testable.
- **Bug fix:** `reports/qbr.js` was calling `writeCsv()` without importing it — would have crashed on the happy path. Fixed by the refactor + caught permanently by biome's `noUndeclaredVariables`.
- **Env config:** `session-to-obsidian.py` `PROJECT_MAP` now overridable via `OBSIDIAN_PROJECT_MAP` (JSON), mirroring `OBSIDIAN_VAULT`. 5 tests cover all edge cases.
- **Settings cleanup:** removed 2 redundant matchers from `.claude/settings.json` (`Asana delete_task`, `Calendar delete_event`) that were already in `permissions.deny`.
- **CI parity:** workflow now runs `ruff` + `biome` + `pytest` + JS tests (was Python-only).
- **Polish:** added `.env.example`, `biome.json`, `ruff.toml`, `tests/js/README.md`, updated `CONTRIBUTING.md` with local test+lint workflow.

### `4f594f6` · PR #23 — Fix audit findings: secret-scan hook, CSV injection, doc drift
**Tags:** `[hook] [safety] [docs] [fix]`

Net: 10 files changed, +385 / −24.

- **New hook:** `secret-scan.py` — blocks `git commit` when staged content matches a known token pattern (Shortcut, GitHub, OpenAI, Anthropic, Slack, AWS, Google API, RSA private key, JWT).
- **CSV injection defense** in `lib/csv-export.js`: leading `=`, `+`, `-`, `@`, and tab are now prefixed with a single quote so Excel/Sheets don't auto-execute them as formulas.
- **Doc drift fixes** across README, SETUP, USER_GUIDE — corrected stale references introduced by earlier PRs.

### `9351841` · PR #22 — Portfolio intelligence + lifecycle + executive reports
**Tags:** `[command] [report] [content]`

Net: 22 files changed, +2,194 / −43. Largest feature drop.

- **Portfolio intelligence commands:** `/health-score`, `/at-risk`, `/expansion`, `/renewal-health`.
- **Lifecycle commands:** `/end-onboarding`, `/handoff`.
- **Executive commands:** `/executive-summary`, `/weekly-team`.
- **New report generators:** `customer-health.js`, `executive-summary.js`, `renewal-health.js` — branded `.docx` output with Desktop auto-copy to `Health Reports/` and `Executive Summaries/` folders.
- **QBR templates** for at-risk and expansion variants in `slabstack-cs/qbr-templates/`.

### `3b1b7fe` · PR #21 — System Action Policy: read/suggest/draft only, hard deny for destructive ops
**Tags:** `[safety] [docs]`

Net: 4 files changed, +52 / −25.

- Established the system action policy: this tool reads, surfaces, and drafts — it does not complete, close, delete, or change state in external systems.
- Added `permissions.deny` entries for `Asana.delete_task`, `Asana.create_project_status_update`, `Calendar.delete_event`, and Shortcut's `stories-delete`, `epics-delete`, `iterations-delete`.
- Updated `/tasks` and `/prs` to explicitly forbid calling `update_tasks` for completion or `stories-update` for workflow state.
- Added a System Action Policy table to `CLAUDE.md` documenting per-system DO and DO-NOT.

### `4c026e3` · PR #20 — `/onboarding-status-report` and `/start-onboarding` commands
**Tags:** `[command] [report]`

Net: 4 files changed, +552.

- `/start-onboarding` — single-command kickoff: Asana project (from standard template), Drive folder, Shortcut CSEng story, Slack channel — drafts all four first, waits for approval, creates the first three, gives channel-creation instructions, then posts resource links after channel confirmation.
- `/onboarding-status-report` — customer-facing branded status report pulling from email, calendar, Asana, and Intercom. Output: `reports/onboarding-status.js` → `out/Onboarding_Status_<CustomerSlug>_<Date>.docx`.

### `c180cbc` · PR #19 — JS tests for csv-export, `test-js` make target, Section 10 in `/review-code`
**Tags:** `[testing] [infra]`

Net: 3 files changed, +215.

- First JS test file: `tests/js/test_csv_export.js` — 21 assertions covering `escapeCsv` null/undefined/numeric handling, multi-section layout, and non-fatal write errors.
- Added `make test-js` target.
- Added Section 10 to `/review-code` checklist for csv-export behavior.

### `2292ef6` · PR #18 — CSV + Google Sheets output for all 13 reports
**Tags:** `[report]`

Net: 27 files changed, +383 / −24.

- Every `.docx` report now ships a paired `.csv` sidecar in `out/` for spreadsheet workflows.
- Added `lib/csv-export.js` (escapeCsv + writeCsv with multi-section support).
- Each report passes a `csvSections` array describing what to export.

### `8497331` · PR #17 — QBR branded `.docx` with Desktop auto-copy
**Tags:** `[report]`

Net: 4 files changed, +273 / −7.

- New `reports/qbr.js` — QBR prep brief generator with cover, exec summary, wins, open issues, renewal context, agenda, next steps, and methodology footer.
- Added `lib/copy-to-desktop.js` — non-fatal copy of generated `.docx` to `~/Desktop/CS Reports/<category>/`.

### `63f7f7e` · PR #16 — Audit fixes: safety, new commands, content, permissions
**Tags:** `[safety] [command] [content] [hook]`

Net: 12 files changed, +914.

- New commands: `/follow-up`, `/go-live`, `/kb-draft`.
- QBR template content for standard/at-risk/expansion variants.
- Hardened `draft-before-create.py` matcher coverage.

### `0f9edf7` · PR #15 — Role selection step in `/setup`
**Tags:** `[command]`

Net: 1 file changed, +96 / −3.

- `/setup` now asks for role (CSM vs CS Engineering) and tailors which commands to surface and which fields to write into the user's personal CLAUDE.md.

### `f58ac0e` · PR #14 — `/prs` command for CSEng eng review queue
**Tags:** `[command]`

Net: 3 files changed, +91.

- `/prs` — read-only view of Shortcut stories in eng review or product review states, grouped by urgency, with how long each has been waiting.

### `91096d0` · PR #13 — `/story-CSEng` command for CS Engineering
**Tags:** `[command]`

Net: 2 files changed, +98.

- `/story-CSEng` — draft-before-create flow for CS Engineers to file Shortcut stories on behalf of CSMs (onboarding blockers, config tasks, bug reports, CSM support requests).

### `b33c82a` · PR #12 — Rename `/review` → `/review-code`
**Tags:** `[command] [docs]`

Net: 3 files changed, +6 / −6.

- Renamed to avoid conflict with Claude Code's built-in `/review` skill.

### `eac368b` · PR #11 — Fix pip cache in CI workflow
**Tags:** `[infra] [fix]`

Net: 1 file changed, +1.

- Added `cache-dependency-path: requirements-dev.txt` so the pip cache step actually finds the file (was silently no-op before, slowing every CI run).

### `367420e` · PR #10 — Doc update: test suite and `/review-code`
**Tags:** `[docs]`

Net: 3 files changed, +51.

- Documented `make test`, the `/review-code` workflow, and the test count in README/SETUP/USER_GUIDE.

### `3d83084` · PR #9 — pytest suite, GitHub Actions CI, Makefile, `/review` command
**Tags:** `[testing] [infra] [command]`

Net: 20 files changed, +1,797.

- Bootstrapped the test infrastructure: 237 pytest tests covering every hook + `lib/report_charts.py`.
- Added the `Makefile` with `test`, `test-hooks`, `test-lib`, `test-cov`, `lint`, `install-dev`, `check-deps` targets.
- Added `.github/workflows/test.yml` CI workflow.
- Added `requirements-dev.txt` (pytest, pytest-cov, matplotlib, pillow).
- Added the `/review` command (later renamed to `/review-code` in PR #12).

### `fc64944` · PR #8 — Fix 9 code review bugs + update CLAUDE.md docs
**Tags:** `[hook] [fix] [report] [docs]`

Net: 7 files changed, +328 / −66.

- `session-to-obsidian.py`: aligned `VAULT_ROOT_FALLBACK` to the exact string `install.sh` searches for; guarded `find_session_file()` against `FileNotFoundError` on fresh installs; made the `rglob` fallback deterministic (returns most-recently-modified).
- `file-protector.py`: tightened dotenv check to exact `.env` or `.env.*` so `.envrc` (direnv) is no longer blocked.
- `push-guard.py`: tightened branch regex to use `(?=\s|$)` lookahead — `main-feature` and `mainstream` branches no longer false-positive.
- `report-theme.js`: distribute DXA remainder to the last kpiStrip card so widths always sum to exactly CW.
- `report_charts.py`: added `_is_dark()` luminance helper; fixed `stacked_bar_h` text color for non-teal segments; fixed `bar()` to render all-negative value sets correctly (previously produced a blank chart due to fixed ylim).

---

## 2026-05-23

### `4079660` · Initial commit — v0
**Tags:** `[command] [hook] [report] [content] [infra] [docs]`

Net: 124 files changed, +17,540. The bootstrap.

- **18 slash commands** for standup (4: daily/midweek/eow/weekstart), Intercom reports (5), onboarding reports (4), customer ops (`/customer`, `/escalate`, `/tasks`), and setup (`/setup`).
- **Hooks:** `branch-enforcer.py`, `push-guard.py`, `block-attribution.py`, `draft-before-create.py`, `file-protector.py`, `pr-template-reminder.py`, `compact-reinject.py`, `audit-log.py`, `notify.py`, `session-to-obsidian.py`.
- **Reports:** 9 report generators (5 Intercom + 4 onboarding) producing branded `.docx` in `out/`.
- **Report theming:** `lib/report-theme.js` with `titleBanner`, `metaStrip`, `sectionHead`, `subHead`, `kpiStrip`, `dataTable`, `callout`, `recBlock`, `codeBlock`, `chartImage`, `centeredImage`, `buildDocument`, `render`.
- **Chart helpers:** `lib/report_charts.py` with `bar`, `stacked_bar_h`, etc.
- **Content:** `slabstack-cs/` directory with KB articles, onboarding scripts, QBR templates, customer master, presales/integrations templates, README.
- **Standup prompts:** `prompts/daily-update.md`, `midweek-update.md`, `eow-update.md`, `week-start-update.md`.
- **Infrastructure:** `package.json`, `install.sh`, `scripts/setup-desktop.sh`, `scripts/setup-desktop.ps1`, `.mcp.json`, `.gitignore`.
- **Docs:** `README.md`, `SETUP.md`, `USER_GUIDE.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `LICENSE`, `.github/pull_request_template.md`.

---

## Numbers at a glance

| Metric | At v0 | At PR #29 (snapshot) | Today |
|---|---|---|---|
| Slash commands | 18 | 44 | 44 |
| Hooks | 10 | 11 (added `secret-scan.py`) | 11 |
| Report generators | 9 | 17 | 17 |
| Python tests | 0 | 443 | 680 |
| JS tests | 0 | 129 | 157 |
| Linters / type-checkers | 0 | 2 (ruff + biome) | 3 (ruff + biome + mypy) |
| Coverage thresholds | none | none | Python ≥85%, JS ≥75% |
| CI checks | 0 | 4 (pytest + ruff + biome + JS) | 6 (pytest + ruff + mypy + biome + JS-cov + pre-commit) |
| `/review-code` sections | n/a | 22 | 23 |

The "Today" column drifts with the repo; if it falls behind reality, refresh it from `make test` and `grep -c "^## Section" .claude/commands/review-code.md`.

---

## Notes on this file

Every entry maps to one PR. To regenerate this file (e.g., after several new PRs), walk `git log --reverse main` and group by date. Squash-merged PRs preserve their PR number in the commit subject (e.g., `(#24)`), which makes back-linking straightforward.

PR bodies on GitHub contain richer context — this file is the chronological index, not the source of truth for any single PR.
