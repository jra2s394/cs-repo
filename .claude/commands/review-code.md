---
description: Run the structured QA checklist — same questions every time, same order
---

Run `make test` first. If tests fail, stop and report failures — do not proceed with the review.

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

## Section 6 — lib/report-theme.js kpiStrip

- [ ] Does the column width calculation distribute the DXA remainder to the last card (so columns always sum to exactly `CW = 9360`)?
- [ ] Formula check: `baseCardW = Math.floor((CW - gw*(n-1)) / n)`, `remainder = CW - gw*(n-1) - baseCardW*n`, last card gets `baseCardW + remainder`.
- [ ] Does the delta display use `c.delta != null` (not `c.delta`) to correctly render a delta of `0`?

## Section 7 — lib/report_charts.py

- [ ] Does `_is_dark()` use luminance formula `0.299r + 0.587g + 0.114b < 140`?
- [ ] Does `stacked_bar_h()` use `_is_dark()` to choose white vs navy label text?
- [ ] Does `bar()` handle negative values: `y_min = min(0, lo) - span*0.05`, `y_max = max(0, hi) + span*0.22`?
- [ ] Are negative bar labels positioned below the bar (`va="top"`, `v - span*0.03`)?
- [ ] Is `span` computed from the absolute value of `lo` when all values are negative (not from `hi`)?

## Section 8 — .claude/settings.json hook matchers

- [ ] Does `draft-before-create.py` have matchers for all Shortcut write operations: `stories-create`, `stories-update`, `stories-delete`, `epics-create`, `epics-update`, `epics-delete`, `iterations-create`, `iterations-update`, `iterations-delete`, `documents-create`, `documents-update`?
- [ ] Does `draft-before-create.py` have matchers for Slack write operations: `slack_send_message`, `slack_send_message_draft`, `slack_schedule_message`?
- [ ] Does `draft-before-create.py` have matchers for Intercom write operations: `create_article`, `update_article`?
- [ ] Does `draft-before-create.py` have matchers for Asana write operations: `create_tasks`, `update_tasks`, `delete_task`?

## Section 9 — General code quality

- [ ] No bare `except:` clauses that swallow all exceptions silently (use `except Exception:` at minimum).
- [ ] No hardcoded UTC offsets for Mountain Time — use `ZoneInfo("America/Denver")` or the MCP calendar tool.
- [ ] No dead code (commented-out blocks that are not documentation of an alternative).
- [ ] No print statements left in production paths of report scripts.

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

---

After all sections: summarize findings as a table:

| Section | Item | Status | File:Line |
|---|---|---|---|

Then state: "Tests: X passed, Y failed" and list any failing test names.
