# Troubleshooting

When something breaks, start here. Findings are grouped by *what you observed*, not by *which file* — you don't know the file yet, that's why you're here.

If you can't find your symptom below, escalate to the team owner with: command name, the time you ran it, contents of `~/.claude/tool-audit.log` (last 50 lines), and the file in `data/outputs/` if one was written.

Architecture refresher: [ARCHITECTURE.md](ARCHITECTURE.md). Setup validator: `/check-setup`.

---

## A command returned data for the wrong person

**Almost always:** your Intercom Admin ID in `~/.claude/CLAUDE.md` doesn't match your authenticated Intercom session. This is the single highest-impact silent failure in the tool.

1. Run `/check-setup` — Step 3 explicitly cross-checks ID-vs-session.
2. If it reports a mismatch: re-do **Step 3 of SETUP.md** (log in to Intercom, copy the number from the profile URL), then update `~/.claude/CLAUDE.md`.

**Less common:** Asana Team GID is wrong, so `/health-score` and `/tasks` filter to the wrong team. Same fix shape — update the GID line in `~/.claude/CLAUDE.md` (see SETUP.md Step 4).

---

## A command returned the wrong time window

**Symptom:** `/daily` claims something happened "yesterday" that didn't, or skips a meeting that was on the calendar.

1. Open `~/.claude/CLAUDE.md` and check the `Time zone:` line. It must be an IANA name (`America/Denver`, `Europe/London`) — not a display name (`Mountain Time`, `PST`).
2. Validate: `python3 -c "from zoneinfo import ZoneInfo; ZoneInfo('<your-value>')"` should exit 0.
3. If invalid, re-run `/setup` — it auto-detects from `readlink /etc/localtime`.

If TZ is correct: check whether the command ran *across a DST boundary*. Calendar/Gmail return UTC; the command translates. A meeting at the boundary can land in the "wrong" day if the IANA name lies (e.g. someone in Arizona using `America/Denver` instead of `America/Phoenix`).

---

## A report `.docx` rendered with broken layout

(KPI strip overflowing, column widths mismatched, table running off the page.)

**Where to look:** `lib/report-theme.js` (column-width math, KPI strip dimensions, brand table builder). Past bugs PR #75 and #76 both lived here.

**Diagnostic:**

1. Inspect the metrics JSON: `data/outputs/<cmd>-metrics-<date>.json`. If a numeric field is missing, `undefined`, or `null` where the renderer expected a number, the renderer's math breaks downstream. Fix the *prompt* (it's not producing the field), not the renderer.
2. If the JSON is well-formed: re-run the renderer in isolation:

   ```
   node reports/<cmd>.js data/outputs/<cmd>-metrics-<date>.json
   ```

   The output goes to `out/`. Open the `.docx` and confirm the layout bug reproduces from that one input.
3. Add a regression test in `tests/js/test_<cmd>_smoke.js` (or extend the existing smoke test that covers all reports) with the offending metrics shape.

---

## A report has the wrong numbers

(Counts off, totals wrong, customer missing.)

**Where to look:** the prompt template (`prompts/<area>-report-template.md`) or the MCP filter the command uses.

**Diagnostic:**

1. Open the metrics JSON in `data/outputs/`. The numbers there are what Claude *wrote* — if they're already wrong, the bug is upstream of the renderer.
2. Re-run the command and watch the chat output: Claude usually narrates each MCP call. A wrong filter (`created_at >= last_30_days` instead of `last_7_days`) shows up here.
3. Cross-check against the source system manually (open Intercom / Asana in the browser, count the same set yourself). Tell the team owner the delta.

---

## A hook blocked a commit unexpectedly

**Common offenders:** `secret-scan` (regex matched something that looks like a token but isn't), `block-attribution` (an AI attribution string slipped in), `branch-enforcer` (you forgot to branch off main).

**Reproduce the hook in isolation:**

```bash
# Replicate the input shape the hook receives from Claude Code:
echo '{"tool_input":{"command":"git commit -m test"}}' | python3 hooks/secret-scan.py
echo $?   # 0 = allowed, 2 = blocked
```

For `secret-scan` specifically: the hook reads `git diff --cached` from the cwd, so to reproduce on a specific staged change, run it from the repo with that change staged.

**False positive in `secret-scan`?** Add the path to `ALLOW_PATHS` in `hooks/secret-scan.py` (exact match, not prefix). Add a test for the path. Document why.

**Inspect what hooks have been firing:** `tail -100 ~/.claude/tool-audit.log` — every tool call is logged with timestamp and tool name.

---

## A hook blocked something it shouldn't (push-guard, file-protector, draft-before-create)

These are designed to bias toward false positives — better to interrupt than to leak. If you're hitting one in legitimate work:

| Hook | Common false-positive | Fix |
|---|---|---|
| `push-guard.py` | A legitimate `git push` to a feature branch reading as `main` because of a typo (`-u origin mai`) | Re-type the branch name carefully |
| `file-protector.py` | Editing a file named `*.example.env` or `*.template.env` | Rename — the matcher is `.env*`, period |
| `draft-before-create.py` | Updating an existing Shortcut story you already drafted | Confirm the permission prompt; the hook is doing its job |
| `branch-enforcer.py` | You're on `main` because someone else's PR was just merged | `git checkout -b <name>` and re-commit |

To verify a hook's matcher: `grep -A3 "<hook-name>" .claude/settings.json`.

---

## A command "completed" but no file was written

**Standup commands** (`/daily`, etc.): file should be at `data/outputs/<cmd>-<date>.md`. If missing, Claude likely ran into an MCP error mid-pull and didn't write. Check the chat for an error message; re-run.

**Report commands**: file should be at `out/<Report_Name>_<date>.docx`. If missing, check `data/outputs/` for the metrics JSON:

- JSON present but no `.docx` → the Node step failed. Run `node reports/<cmd>.js <metrics-json>` manually to see stderr.
- No JSON either → Claude didn't get to the write step. Check chat for an MCP error.

**Read-only commands** (`/customer`, etc.): there is *no file*. Output is chat-only. If you want it saved, copy from chat manually.

---

## `/check-setup` reports an MCP failure

| MCP failing | Try |
|---|---|
| Gmail, Calendar, or Drive | claude.ai → Settings → Integrations → reconnect any one (they share a single Google login) |
| Asana | Reconnect; verify your Asana login still works in the browser |
| Intercom | Reconnect; if the shared Slabstack login was rotated, you need the new credentials |
| Slack | Reconnect; verify your Slack workspace permissions |
| Shortcut | Check `.mcp.json` — the Shortcut MCP is `stdio` and depends on a local `SHORTCUT_API_TOKEN` env var |

For a deeper read on MCP setup, see the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp).

---

## `make test` or `make lint` fails after a code change

1. Read the failure carefully. The test name usually points at the file you changed.
2. For frontmatter / no-stale-terms / parity tests: these guard documentation. A new term needs an allow-list entry (see `tests/test_no_stale_terms.py` for the pattern).
3. For hook tests: replicate the failing test's input shape using the `echo | python3 hooks/<name>.py` form (see "A hook blocked a commit unexpectedly" above).
4. For report smoke tests: usually the metrics JSON shape changed in a way the smoke test wasn't expecting. Add the new field to the fixture in `tests/js/fixtures/`.

Run a single failing test in isolation:

```bash
python3 -m pytest tests/hooks/test_<name>.py::test_<case> -v
node --test tests/js/test_<name>.js
```

---

## Pre-commit hook fails

Different from Claude Code hooks — these are `pre-commit` framework hooks defined in `.pre-commit-config.yaml`. They run at `git commit` time after Claude Code's own hooks.

Common failures:

| Failure | Fix |
|---|---|
| `trailing-whitespace` | The fix is automatic on re-run — `pre-commit` rewrites the file, you just `git add` again |
| `end-of-file-fixer` | Same — re-stage after pre-commit fixes it |
| `ruff` | Read the error; fix the Python lint issue manually |
| `biome` | Same — read the JS lint error and fix |
| `detect-private-key` | A literal PEM block in the diff. If it's a fixture, mark the file `# pragma: allowlist secret` or move it to `tests/` |
| `check-yaml` / `check-json` | Genuine syntax error in the file you edited |

Bypass is **not** the answer — `--no-verify` is blocked by the surrounding instructions for a reason. Fix the underlying issue.

---

## "I have no idea what's wrong"

Last-resort diagnostic flow:

1. `tail -200 ~/.claude/tool-audit.log` — what was the last tool call before the symptom?
2. `ls -lt data/outputs/ | head -10` — what files were just written?
3. `git status` — any unexpected modifications?
4. `/check-setup` — anything turned red since you last ran it?

If still stuck: open a GitHub issue with the answers to the four above. The team owner can usually narrow it from there.

---

## What this doc does NOT cover

- Setup-time errors (file missing, MCP not connected for the first time) — those are in SETUP.md "Something not working?" and TEAM_SETUP.md "Trouble?"
- How to add a new command — see [COMMAND_GUIDE.md](COMMAND_GUIDE.md)
- Hook internals — see `hooks/README.md`

Refresh this doc whenever a new failure mode bites the team or a fix pattern emerges that future-you would want documented.
