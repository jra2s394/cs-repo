# Adding a new slash command

How to add a command to the CS Ops tool. Written for someone who has read [ARCHITECTURE.md](ARCHITECTURE.md) once.

If you only need to *use* commands, you don't need this — see [USER_GUIDE.md](../USER_GUIDE.md). This is for contributors.

---

## Decision: which command archetype do you need?

Pick from the three shapes ARCHITECTURE.md describes:

| If your new thing produces… | Archetype | What you'll write |
|---|---|---|
| A Slack-ready Markdown post in house format | **Standup-style** | `.claude/commands/<name>.md` + optional `prompts/<name>.md` |
| A branded `.docx` report file | **Report-style** | `.claude/commands/<name>.md` + `reports/<name>.js` + a `prompts/<area>-report-template.md` if your area doesn't already have one |
| A one-screen briefing in chat, no file output | **Read-only** | `.claude/commands/<name>.md` only |

The wrong archetype is hard to migrate later — pick deliberately. Read-only is the safest default; promote to standup or report only when there's a real user need to save a file.

---

## Step 1 — Create the command file

```
.claude/commands/<your-name>.md
```

`<your-name>` becomes the slash command (`/your-name`). Use kebab-case. Avoid names that collide with built-in Claude Code commands (`/help`, `/clear`, `/mcp`, `/setup`, etc. — see Claude Code docs for the live list).

### Required frontmatter

Every command file **must** open with a `---` block containing a `description:` field. The frontmatter test (`tests/test_commands_frontmatter.py`) enforces:

- Frontmatter block is present
- `description:` is non-empty
- Description is ≥ 20 characters
- Description does not start with `todo`, `tbd`, `wip`, `placeholder`, or `fixme`
- Description does not end with `...`
- Description is a single line

If your command takes an argument, add `argument-hint:` in bracket notation:

```yaml
---
description: Generate a Word doc with this quarter's churn-risk customers, ranked by ARR at stake
argument-hint: [quarter] [year]
---
```

### Body structure (what works)

Real commands in this repo all follow the same body shape — copy from a similar one:

1. **Lead sentence** stating the outcome the user gets.
2. **`Read CLAUDE.md from this repo before starting.`** as line 5 — guarantees the house rules and accuracy guards apply.
3. **Numbered steps** the model follows in order. Use `## Step 1`, `## Step 2`, etc.
4. **Explicit MCP calls** named. Don't say "search Asana" — say `search_tasks(assignee.gid='me', completed_since='now')`.
5. **Output contract** at the end. Where does the file go? What's its name pattern? Does it post to chat with an approval prompt?

---

## Step 2 — Add the prompt template (if needed)

Add a `prompts/<name>.md` (or extend an existing one) when:

- The data-pull instructions are long enough to clutter the command file
- Multiple commands share the instructions (e.g. all 5 `/intercom-*` use `prompts/intercom-report-template.md`)

Skip this step for short read-only commands.

---

## Step 3 — Add the Node renderer (report-style only)

```
reports/<your-name>.js
```

Copy an existing report (`reports/intercom-daily.js` is the smallest) and adapt:

1. Define the input contract — the metrics JSON shape the prompt will produce
2. Import `lib/report-theme.js` for KPI strip, table builders, brand styling
3. Import `lib/report_charts.py` if you need charts (Node shells out to Python; matplotlib produces PNGs that get embedded)
4. Write to `out/<Report_Name>_<dateSlug>.docx`
5. Call `lib/copy-to-desktop.js::copyToDesktop(srcFile, category, label)` if the report belongs in `~/Desktop/CS Reports/<category>/`

**Critical contract for renderers:** never assume the metrics JSON has every field. Past bugs (PR #75 `kpiStrip`, PR #76 `dateSlug`) all came from renderers assuming a field was present. Use `value ?? defaultText` defensively at the renderer boundary, log loudly when a field is missing, but don't crash.

Add a smoke test in `tests/js/test_<your-name>.js` (or extend `tests/js/test_reports_smoke.js` which already runs every report against a minimal fixture).

---

## Step 4 — Register the command

Three places, all required:

1. **`CLAUDE.md`** — add a row to the appropriate command table (Standup, Reports, Customer intelligence, Onboarding, Renewals, Tooling). Match the existing format exactly.
2. **`USER_GUIDE.md`** — add to the quick-reference table at the top so end users can find it.
3. **`/setup` Step 6** — if the command is role-specific (CSM-only, Director-only, etc.), add to the relevant role's command list in `.claude/commands/setup.md`.

The `/commands` slash command auto-discovers every file in `.claude/commands/`, so it doesn't need updating — but CLAUDE.md tables are maintained by hand. There is no parity test yet, so if you skip step 1, CI passes but the command is invisible to anyone reading the CLAUDE.md inventory. Don't skip it.

---

## Step 5 — Test before opening a PR

```bash
make test           # 571 Python + 157 JS tests
make lint           # ruff + biome
pre-commit run --all-files   # 9 hooks, same as commit-time
```

If you added a report:

```bash
node reports/<your-name>.js tests/js/fixtures/<your-name>-metrics.json
open out/<Report_Name>_*.docx
```

Confirm the layout visually — column widths, KPI strip, chart sizing. The smoke test catches "does it render", not "does it look right."

For commands that read MCP data, do a live dry run:

1. Type the command in Claude Code in the cs-repo directory
2. Walk through it end-to-end with real data
3. Confirm the output matches the contract you wrote in Step 1
4. **Don't approve the post / file write** — read-only verification is enough

---

## Step 6 — PR checklist

Before opening the PR:

- [ ] Frontmatter has non-empty `description:` (≥ 20 chars, not a placeholder)
- [ ] Command registered in `CLAUDE.md` in the right section
- [ ] Listed in `USER_GUIDE.md` quick-reference table
- [ ] Added to `/setup` Step 6 role list (if role-specific)
- [ ] `make test` green
- [ ] `make lint` green
- [ ] `pre-commit run --all-files` green
- [ ] If report-style: fixture added under `tests/js/fixtures/` and smoke test covers it
- [ ] If destructive (creates/updates external items): draft-before-create pattern is followed in the prompt, and the prompt explicitly says the user must approve before any external write
- [ ] PR body matches `.github/pull_request_template.md` exactly

---

## Worked example: adding `/expansion-monthly`

A hypothetical monthly expansion report (currently we have `/expansion` as a read-only single-customer command; this would add a portfolio-wide monthly snapshot).

**Files created:**

- `.claude/commands/expansion-monthly.md` — frontmatter `description: Monthly expansion pipeline — accounts with upsell signals, ranked by likely ARR add, exported as .docx`, body follows the report-style structure
- `reports/expansion-monthly.js` — reads metrics JSON, writes `out/Expansion_Monthly_<date>.docx`
- `tests/js/fixtures/expansion-monthly-metrics.json` — minimal fixture with 3 fake accounts

**Files updated:**

- `CLAUDE.md` — new row in a new "Expansion reports" table under the "Onboarding reports" section
- `USER_GUIDE.md` — new entry in the quick-reference
- `.claude/commands/setup.md` — added to CSM and Director role lists (skip CS Engineer and President)
- `tests/js/test_reports_smoke.js` — added `expansion-monthly` to the report-name array

**Test commands run:**

```bash
make test && make lint
node reports/expansion-monthly.js tests/js/fixtures/expansion-monthly-metrics.json
open out/Expansion_Monthly_2026-05-25.docx   # visual check
```

**PR title:** `feat: add /expansion-monthly portfolio report`

That's the full shape. New commands shouldn't take more than 2–3 hours from "decided to add it" to "merged" — most of which is testing.

---

## What this doc does NOT cover

- *Designing* a new command (what data to pull, what insights to surface) — that's a product question, not a how-to-add-it question
- Adding a new MCP server — see `.mcp.json` and the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)
- Adding a new hook — see `hooks/README.md`
- Modifying the brand layout — `lib/report-theme.js` has inline comments

Refresh this doc when the test contract changes, the registration places change, or a new pattern emerges that the next contributor needs to follow.
