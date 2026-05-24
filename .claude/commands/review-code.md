---
description: Run the structured QA checklist — same questions every time, same order
---

Run `make test` first. If any of the 394 tests fail (265 Python + 129 JS), stop and report failures — do not proceed with the review. Then run `make lint` to confirm ruff and biome are both clean.

Then work through every section below in order. For each item: check it, mark ✅ (pass) or ❌ (fail + exact line), and do not skip. Report all findings at the end in a single block.

---

## Section 1 — push-guard.py

- [ ] Does every `.env` regex include `(?!\.(example|sample|template))` to allow safe suffixes?
- [ ] Does every `.env` regex include `(?!\[a-zA-Z\])` or equivalent to allow `.envrc`?
- [ ] Does every `.env` regex include `(?:\S+/)?` to catch path-prefixed variants like `config/.env`?
- [ ] Are `main` and `master` protected branch regexes using `(?=\s|$)` to prevent false positives on `mainstream`, `main-feature`, etc.?
- [ ] Does the hook exit 0 on invalid JSON input (not crash)?

## Section 2 — file-protector.py

- [ ] Is `.env` checked with `basename == ".env"` (exact match), not `startswith(".env")`?
- [ ] Does `.env.*` check use `startswith(".env.")` (with dot) to exclude `.envrc`?
- [ ] Does `.env.*` check exclude `.example`, `.sample`, `.template`?
- [ ] Is `.git/` blocked via path substring check (not just basename)?
- [ ] Does the hook exit 0 on invalid JSON input?

## Section 3 — branch-enforcer.py

- [ ] Is `subprocess.run` wrapped in try/except so a git error doesn't block the tool call?
- [ ] Does the hook exit 0 (not block) for non-commit commands?
- [ ] Is the protected list explicit (`["main", "master"]`) — not a substring check?

## Section 4 — block-attribution.py

- [ ] Is the check case-insensitive (`.lower()` before comparison)?
- [ ] Does it only fire on `git commit` commands, not `git log`, `git push`, etc.?
- [ ] Does it exit 0 on invalid JSON?

## Section 5 — session-to-obsidian.py

- [ ] Does `find_session_file()` guard `CLAUDE_PROJECTS.iterdir()` with `if not CLAUDE_PROJECTS.exists(): return None`?
- [ ] Does `VAULT_ROOT_FALLBACK` use a literal string (`Path("/path/to/your/obsidian/vault")`), not a Python expression, so `install.sh`'s `str.replace()` finds it?
- [ ] Does `rglob` fall back to `max(matches, key=…)` when the session isn't in a predictable path?
- [ ] Does `OBSIDIAN_PROJECT_MAP` env var (JSON object) override `PROJECT_MAP_FALLBACK`, and fall back cleanly on invalid JSON / wrong shape (not crash)?

## Section 6 — lib/report-theme.js kpiStrip

- [ ] Does the column width calculation distribute the DXA remainder to the last card (so columns always sum to exactly `CW = 9360`)? (Verified by `tests/js/test_report_theme.js::kpiWidths math` for n=1–12.)
- [ ] Formula check: `baseCardW = Math.floor((CW - gw*(n-1)) / n)`, `remainder = CW - gw*(n-1) - baseCardW*n`, last card gets `baseCardW + remainder`. The math lives in the exported `kpiWidths(n, gw, totalW)` helper.
- [ ] Does the delta display use `c.delta != null` (not `c.delta`) to correctly render a delta of `0`? (Verified by `kpiStrip with delta=0 renders '0'`.)

## Section 7 — lib/report_charts.py

- [ ] Does `_is_dark()` use luminance formula `0.299r + 0.587g + 0.114b < 140`?
- [ ] Does `stacked_bar_h()` use `_is_dark()` to choose white vs navy label text?
- [ ] Does `bar()` handle negative values: `y_min = min(0, lo) - span*0.05`, `y_max = max(0, hi) + span*0.22`?
- [ ] Are negative bar labels positioned below the bar (`va="top"`, `v - span*0.03`)?
- [ ] Is `span` computed from the absolute value of `lo` when all values are negative (not from `hi`)?

## Section 8 — .claude/settings.json hook matchers

Delete operations are gated by `permissions.deny` (Section 9b), not by `draft-before-create` — denial supersedes the draft prompt. Matchers should only cover non-delete writes.

- [ ] Does `draft-before-create.py` have matchers for all Shortcut non-delete writes: `stories-create`, `stories-update`, `epics-create`, `epics-update`, `iterations-create`, `iterations-update`, `documents-create`, `documents-update`?
- [ ] Does `draft-before-create.py` have matchers for Slack write operations: `slack_send_message`, `slack_send_message_draft`, `slack_schedule_message`?
- [ ] Does `draft-before-create.py` have matchers for Intercom write operations: `create_article`, `update_article`?
- [ ] Does `draft-before-create.py` have matchers for Asana non-delete writes: `create_tasks`, `update_tasks`?
- [ ] No dead matchers — every entry in `hooks.PreToolUse` should NOT also appear in `permissions.deny` (a denied call never reaches the matcher).

## Section 9 — General code quality

- [ ] No bare `except:` clauses that swallow all exceptions silently (use `except Exception:` at minimum).
- [ ] No hardcoded UTC offsets for Mountain Time — use `ZoneInfo("America/Denver")` or the MCP calendar tool.
- [ ] No dead code (commented-out blocks that are not documentation of an alternative).
- [ ] No print statements left in production paths of report scripts.

## Section 9b — System Action Policy (permissions.deny)

- [ ] Does `permissions.deny` in `.claude/settings.json` include `mcp__claude_ai_Asana__delete_task`?
- [ ] Does `permissions.deny` include `mcp__claude_ai_Google_Calendar__delete_event`?
- [ ] Does `permissions.deny` include `mcp__shortcut__stories-delete`, `epics-delete`, and `iterations-delete`?
- [ ] Does `permissions.deny` include `mcp__claude_ai_Asana__create_project_status_update`?
- [ ] Does `tasks.md` explicitly say NOT to call `update_tasks` for completion — only tell the user what to do in Asana?
- [ ] Does `prs.md` explicitly say NOT to call `stories-update` to change workflow state?
- [ ] Does `CLAUDE.md` contain a "System Action Policy" table showing what Claude does and does not do per system?

## Section 10 — lib/csv-export.js

- [ ] Does `escapeCsv(null)` return `""` (not the string `"null"`)?
- [ ] Does `escapeCsv(undefined)` return `""` (not `"undefined"`)?
- [ ] Does `escapeCsv(42)` return `"42"` without wrapping in quotes (numeric coercion, no false positive)?
- [ ] Does a value containing a comma get wrapped in double quotes?
- [ ] Does a value containing a double-quote character get the quote doubled (`say "hi"` → `"say ""hi"""`)?
- [ ] Does a value containing a newline get wrapped in double quotes?
- [ ] Does `sec.title` produce a `# Title` row as the first line of its section?
- [ ] Does `sec.headers` produce a header row before data rows?
- [ ] Are sections separated by exactly one blank line (no blank before the first section)?
- [ ] Does `writeCsv` silently swallow file-write errors (non-fatal) — never throws on an unwritable path?

## Section 11 — reports/onboarding-status.js & onboarding commands

- [ ] Does `onboarding-status.js` list all required fields in REQUIRED and `process.exit(1)` if any are missing?
- [ ] Does the Contact Directory table render `c.phone || "—"` so missing phone numbers show `—` not blank?
- [ ] Does the Task Status section handle an empty `asanaTasks` array without throwing (callout still renders)?
- [ ] Does the Timeline section show "Past Due" when `daysToGoLive <= 0`?
- [ ] Does the Open Items section render urgent items as `warn` callouts and normal items as table rows?
- [ ] Does `copyToDesktop` use category `"Onboarding"` and label `"Status"` (consistent with other onboarding reports)?
- [ ] Does `writeCsv` export all four sections: Contacts, Timeline, Tasks, Open Items?
- [ ] Does `start-onboarding.md` present all four items (Asana, Drive, Shortcut, Slack channel name) and wait for explicit approval before executing any of them?
- [ ] Does `start-onboarding.md` wait for Slack channel creation confirmation before posting the resource links?
- [ ] Does `start-onboarding.md` include a graceful fallback for Drive folder creation failure (manual URL prompt)?

## Section 12 — lib/data-loader.js

- [ ] Does `loadJson()` call `process.exit(1)` when `process.argv[2]` is missing (not throw)?
- [ ] Does `loadJson()` call `process.exit(1)` on invalid JSON (not crash with unhandled exception)?
- [ ] Does `requireFields()` print the full list of missing fields before exiting — not just the first one?
- [ ] Does `ensureOutDir()` return the absolute path to `out/` (not a relative path)?
- [ ] Are all four exports present: `{ loadJson, requireFields, ensureOutDir, dateSlug }`?
- [ ] Does `dateSlug()` return `"unknown-date"` for null/undefined/empty input (not throw, not return `"-"`)?
- [ ] Does `dateSlug()` collapse runs of `-` and trim leading/trailing `-`?

## Section 13 — reports/customer-health.js

- [ ] Does the Account Scorecard table use column widths that sum to exactly 9360 DXA?
  - Expected: `[2400, 1600, 1200, 1760, 1200, 1200]` = 9360
- [ ] Does the At-Risk table use column widths that sum to exactly 9360 DXA?
  - Expected: `[2400, 3160, 1600, 2200]` = 9360
- [ ] Does the Renewal Radar table use column widths that sum to exactly 9360 DXA?
  - Expected: `[2800, 1760, 1200, 1600, 2000]` = 9360
- [ ] Does the at-risk section render urgent items as `warn` callouts and watch items as a table?
- [ ] Does `copyToDesktop` use category `"Health Reports"` and label `"Portfolio"`?
- [ ] Does `writeCsv` export all four sections: Portfolio Summary, Account Scorecard, At-Risk Accounts, Renewal Radar?
- [ ] Does the report exit cleanly (process.exit 1) on missing required fields?

## Section 14 — reports/renewal-health.js

- [ ] Does the Full Renewal Pipeline table use column widths that sum to exactly 9360 DXA?
  - Expected: `[2000, 1360, 800, 1200, 1000, 1200, 1800]` = 9360
- [ ] Does the Renewal Pipeline Summary table use column widths that sum to exactly 9360 DXA?
  - Expected: `[2800, 1600, 2360, 2600]` = 9360
- [ ] Does the High-Risk Renewals section only render when `highRisk.length > 0`?
- [ ] Does the Renewal Playbook section only render when `d.playbook && d.playbook.length > 0`?
- [ ] Does `copyToDesktop` use category `"Renewals"` and label `"Health"`?
- [ ] Does `writeCsv` export all three sections: Pipeline Summary, Renewal Pipeline, Renewal Playbook?

## Section 15 — reports/executive-summary.js

- [ ] Does the Portfolio Overview table use column widths that sum to exactly 9360 DXA?
  - Expected: `[3360, 3000, 3000]` = 9360
- [ ] Does the Open Issues section render critical items as `warn` callouts and watch items as a table?
- [ ] Does the watch-items table use column widths that sum to exactly 9360 DXA?
  - Expected: `[1600, 1800, 3160, 1400, 1400]` = 9360
- [ ] Does `copyToDesktop` use category `"Executive Summaries"` and label `"Summary"`?
- [ ] Does `writeCsv` export all three sections: Portfolio Overview, Highlights, Open Issues?
- [ ] Does the Onboarding Snapshot section only render when `d.onboardingSnapshot` is non-empty?
- [ ] Does the Upcoming Events table use column widths that sum to exactly 9360 DXA?
  - Expected: `[1600, 2400, 3760, 1600]` = 9360

## Section 16 — New commands (at-risk, health-score, renewal-health, executive-summary)

- [ ] Does `at-risk.md` explicitly state read-only: no tasks, messages, or tickets are created in this command?
- [ ] Does `health-score.md` require data from at least 3 live tool sources before assigning 🟢 Green?
- [ ] Does `health-score.md` default missing-data accounts to 🔴 (data gap is a risk signal)?
- [ ] Does `renewal-health.md` explicitly forbid inventing renewal dates or ARR figures?
- [ ] Does `executive-summary.md` require that every highlight is sourced before including it?

## Section 17 — Lifecycle commands (start-onboarding, end-onboarding, handoff)

- [ ] Does `end-onboarding.md` explicitly say NOT to mark Asana tasks complete via API?
- [ ] Does `end-onboarding.md` wait for explicit approval before sending the go-live email?
- [ ] Does `end-onboarding.md` wait for explicit approval before creating post-closure Asana tasks?
- [ ] Does `handoff.md` flag outstanding email commitments as 🔴?
- [ ] Does `handoff.md` explicitly say NOT to update Shortcut story ownership via API?
- [ ] Does `handoff.md` wait for explicit approval before sending the introduction email?

## Section 18 — setup-desktop.sh

- [ ] Does `setup-desktop.sh` create `~/Desktop/CS Reports/Health Reports/`?
- [ ] Does `setup-desktop.sh` create `~/Desktop/CS Reports/Executive Summaries/`?
- [ ] Does the footer message list all six report folders (Intercom, Onboarding, Renewals, QBR, Health Reports, Executive Summaries)?

## Section 19 — lib/report-theme.js publishReport + CI parity

- [ ] Does `publishReport(doc, outFile, opts)` skip CSV when `opts.csvSections` is omitted (no zero-section CSV written)?
- [ ] Does `publishReport` skip the Desktop copy when `opts.category` or `opts.label` is missing?
- [ ] Does `publishReport` catch render errors and `process.exit(1)` so callers don't need their own `.catch`?
- [ ] Do all 17 reports/*.js call `T.publishReport()` exactly once and NOT call `copyToDesktop`/`writeCsv`/`T.render` directly?
- [ ] Does `biome check` pass (`make lint-js`) — no undeclared variables or unused imports?
- [ ] Does `.github/workflows/test.yml` run `make lint-js`, `make test-js`, AND `pytest` (Python-only CI is a regression)?

---

After all sections: summarize findings as a table:

| Section | Item | Status | File:Line |
|---|---|---|---|

Then state: "Tests: X passed, Y failed" and list any failing test names.
