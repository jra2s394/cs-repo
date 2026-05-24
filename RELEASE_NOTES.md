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

| Metric | At v0 | After PR #24 (today) |
|---|---|---|
| Slash commands | 18 | 38 |
| Hooks | 10 | 11 (added `secret-scan.py`) |
| Report generators | 9 | 17 |
| Python tests | 0 | 265 |
| JS tests | 0 | 129 |
| Linters | 0 | 2 (ruff + biome) |
| CI checks | 0 | 4 (pytest + ruff + biome + JS) |

---

## Notes on this file

Every entry maps to one PR. To regenerate this file (e.g., after several new PRs), walk `git log --reverse main` and group by date. Squash-merged PRs preserve their PR number in the commit subject (e.g., `(#24)`), which makes back-linking straightforward.

PR bodies on GitHub contain richer context — this file is the chronological index, not the source of truth for any single PR.
