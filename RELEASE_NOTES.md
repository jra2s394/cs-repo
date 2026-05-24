# Release Notes

Chronological history of every change merged to `main`, from the first commit to the latest. Each entry maps to a single merged PR. Entries are grouped by date and tagged by theme so you can scan for a class of change (e.g. `[command]`, `[safety]`, `[testing]`).

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

## 2026-05-24

### `<pending>` · PR #31 — Cross-reference 8 HIGH-priority commands to `/health-score` Step 1 gotchas
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

Battle-tested `/health-score` against the real portfolio (one full [CUSTOMER_A] deep-dive + one portfolio scorecard across 30 active customers). Three live gaps surfaced that would otherwise show up as broken-looking commands for the next teammate. All three are now documented and structurally addressed in the skill prompt:

- **Single-customer mode added.** `/health-score <name>` now produces a focused per-customer snapshot (same rubric, one account, inline only — no `.docx`). Mode detection happens at Step 0; the portfolio path is unchanged. Useful before a customer call, a renewal, or any "is this account healthy?" check. The [CUSTOMER_A] deep-dive proved the value; without this, teammates would get a portfolio report when they wanted a focused one.
- **Asana team filter now in the prompt.** Without it, an unfiltered `get_projects` returns projects from sibling product teams (e.g., [TEAM_OTHER]) that pollute the scorecard. Skill now instructs to pass the team GID; Slabstack's GID `[ASANA_TEAM_GID]` is documented and the discovery method (grep a known project URL) is spelled out for other teams.
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

| Metric | At v0 | After PR #29 (today) |
|---|---|---|
| Slash commands | 18 | 44 |
| Hooks | 10 | 11 (added `secret-scan.py`) |
| Report generators | 9 | 17 |
| Python tests | 0 | 443 |
| JS tests | 0 | 129 |
| Linters | 0 | 2 (ruff + biome) |
| CI checks | 0 | 4 (pytest + ruff + biome + JS) |
| `/review-code` sections | n/a | 22 |

---

## Notes on this file

Every entry maps to one PR. To regenerate this file (e.g., after several new PRs), walk `git log --reverse main` and group by date. Squash-merged PRs preserve their PR number in the commit subject (e.g., `(#24)`), which makes back-linking straightforward.

PR bodies on GitHub contain richer context — this file is the chronological index, not the source of truth for any single PR.
