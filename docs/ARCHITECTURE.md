# Architecture

How a user input becomes a Slack post, a `.docx`, or a one-screen briefing. Written for an engineer who has never opened this repo.

If you're new and reading this top-to-bottom, the answer to "what happens when I type `/daily`" is below. If you're debugging a specific failure, jump to [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## The 30-second picture

```
user types /cmd in Claude Code
        │
        ▼
.claude/commands/cmd.md     ← prompt instructions (what to do, in what order)
        │
        ▼
Claude reads context        ← CLAUDE.md, ~/.claude/CLAUDE.md, the command's prompt file
        │
        ▼
Hooks intercept              ← PreToolUse hooks can block tool calls before they run
(branch-enforcer,            ← (only the ones whose matchers fire for the current tool)
 draft-before-create, …)
        │
        ▼
Claude calls MCP tools       ← Gmail / Calendar / Asana / Intercom / Shortcut / Slack / Drive
        │
        ▼
PostToolUse hooks log/notify ← audit-log appends every call; notify pings on attention
        │
        ▼
One of three output shapes:
        │
        ├─ standup → data/outputs/<cmd>-<date>.md           (no .docx, no Node step)
        │
        ├─ report  → data/outputs/<cmd>-metrics-<date>.json
        │             │
        │             ▼
        │           node reports/<cmd>.js <metrics.json>     ← reads JSON, calls lib/report-theme.js
        │             │
        │             ▼
        │           out/<Report_Name>_<date>.docx
        │             │
        │             ▼
        │           lib/copy-to-desktop.js → ~/Desktop/CS Reports/<category>/  (if user ran setup-desktop)
        │
        └─ read-only → inline output only (no file written)
```

---

## The three command archetypes

Every command in `.claude/commands/` matches one of three shapes. Knowing which shape a command is tells you where to look when it breaks.

### 1. Standup-style (markdown only)

**Examples:** `/daily`, `/midweek`, `/eow`, `/weekstart`, `/standup-recap`

**Flow:** Command file → reads matching prompt in `prompts/<cmd>-update.md` → Claude pulls data from Gmail/Calendar/Asana/Intercom → assembles in house format → saves to `data/outputs/<cmd>-<date>.md` → posts the draft to chat for user approval → user copies to Slack manually (Claude does not auto-post).

**No `reports/*.js`. No `.docx`. No `out/`.**

**Where bugs hide:** prompt file (wrong instructions), MCP call shape (wrong filter), accuracy rules (hallucinated wins).

### 2. Report-style (JSON → Node → `.docx`)

**Examples:** all 5 `/intercom-*`, all 4 `/onboarding-*`, all 3 `/renewals-*`, `/health-score`, `/qbr`, `/executive-summary`, `/at-risk` (when run portfolio-wide)

**Flow:** Command file → reads matching template in `prompts/<area>-report-template.md` → Claude pulls data → writes a metrics JSON to `data/outputs/<cmd>-metrics-<date>.json` → invokes `node reports/<cmd>.js <metrics.json>` → that script reads the JSON, calls `lib/report-theme.js` for the brand layout (column widths, kpi strip, chart embeds), writes `out/<Report_Name>_<date>.docx`, optionally calls `lib/copy-to-desktop.js` to mirror into `~/Desktop/CS Reports/<category>/`.

**Two-layer separation:** Claude controls the *data* (the JSON shape). The Node script controls the *presentation* (layout, colors, fonts, chart sizing). A bug in column widths is *always* a Node-side bug; a bug in "wrong number on the page" is *always* a Claude-side / prompt-side / MCP-filter bug.

### 3. Read-only (no file written)

**Examples:** `/customer`, `/customer-search`, `/inbox-triage`, `/meeting-prep`, `/meeting-notes`, `/prs`, `/check-setup`, `/my-tasks`, `/commands`, `/at-risk` (when single-customer)

**Flow:** Command file → Claude pulls data → assembles inline summary → prints to chat. No file output. The user reads the screen and decides what to do.

**Where bugs hide:** prompt file, MCP filters. No file layer to inspect after the fact — what you see in chat *is* the output.

---

## Where each piece lives

| Layer | Path | Purpose |
|---|---|---|
| Command registry | `.claude/commands/*.md` | One file per slash command. Frontmatter `description:` becomes the help text. Body is the prompt. |
| Prompt templates | `prompts/*.md` | Long-form data-pull instructions shared across related commands (e.g. `intercom-report-template.md` is used by all 5 `/intercom-*` commands). |
| Report renderers | `reports/*.js` | Node scripts that turn metrics JSON into `.docx`. One per report command. |
| Layout helpers | `lib/report-theme.js` | Brand colors, KPI strip, data table, column-width math. All report renderers go through this. |
| Chart generation | `lib/report_charts.py` | Matplotlib → PNG charts embedded into `.docx`. Python (not Node) because matplotlib is the path of least resistance for these shapes. |
| Data helpers | `lib/data-loader.js`, `lib/csv-export.js` | Finance sheet parsing (xlsx/csv), CSV export. |
| Desktop mirror | `lib/copy-to-desktop.js` | After a report writes to `out/`, this copies it to `~/Desktop/CS Reports/<category>/` if the user ran `scripts/setup-desktop.sh`. |
| Hooks | `hooks/*.py` | Intercept tool calls (block/warn/log). Registered in `.claude/settings.json` under one of 6 event types. |
| Per-user config | `~/.claude/CLAUDE.md` | Personal — name, email, Intercom ID, Asana Team GID, IANA time zone. Never committed. |
| Repo config | `CLAUDE.md` | Shared — house style, accuracy rules, command index, hook list. Read every session. |

---

## The data/outputs/ and out/ contract

These two directories are the seam between the Claude side and the Node side.

| Directory | Owner | Contents | Gitignored? |
|---|---|---|---|
| `data/outputs/` | Claude (writes), Node (reads metrics JSON) | `daily-<date>.md`, `<cmd>-metrics-<date>.json`, `<cmd>-<date>.md` | Yes — runtime artifacts, never committed |
| `out/` | Node (writes), user (reads / copies to Slack/Drive) | `<Report_Name>_<date>.docx`, occasional `.csv` | Yes — runtime artifacts, never committed |

A `.gitkeep` in each preserves the directory in git so a fresh clone has it.

When debugging a report bug, inspect the metrics JSON in `data/outputs/` first — if the JSON shape is wrong, the bug is in the Claude/prompt layer; if the JSON is correct but the `.docx` is wrong, the bug is in `reports/<cmd>.js` or `lib/report-theme.js`.

---

## Hook event ordering

We currently wire 10 of the 29 hook events Claude Code supports (v2.1.141+). The full 29-event catalog with categories lives in [hooks/README.md § Available events](../hooks/README.md#available-events); this section explains *when each wired event fires* relative to a tool call, and which hooks use which.

| Event | When it fires | Can it block? |
|---|---|---|
| `UserPromptSubmit` | After the user hits Enter, before Claude starts | Yes — can inject context or refuse the prompt |
| `PreToolUse` | Before a tool call (Bash, Edit, Write, MCP call) actually runs | Yes — exit 2 blocks the call, prints stderr to user |
| `PostToolUse` | After a tool call returns successfully | No — fire-and-forget (`audit-log`, `notify`, `lint-after-edit`) |
| `PostToolUseFailure` | After a tool call returns an error (wired round 41) | No — used by `audit-log` so failed calls don't silently vanish from the forensic trail |
| `SubagentStart` | Subagent spawned (wired round 85) | No — used by `audit-log` so subagent lifecycle is captured next to tool calls |
| `SubagentStop` | Subagent finishes (wired round 85) | No (we don't block) — used by `audit-log` to pair with the SubagentStart entry |
| `ConfigChange` | When a settings file (project/local/user) or skill/agent frontmatter is mutated (wired round 68) | No — used by `config-change-audit` to log every config edit for post-incident review |
| `Notification` | When Claude needs user attention (idle prompt, permission request) | No |
| `Stop` | When the assistant turn ends | No — used by `session-to-obsidian.py` to export the transcript |
| `PreCompact` | Before context-window compaction | No — used by `compact-reinject.py` to re-inject critical rules |

**The commit-time blockers** (`branch-enforcer`, `push-guard`, `block-attribution`, `secret-scan`, `draft-before-create`, `file-protector`) all hang off `PreToolUse` with `matcher: "Bash"` or a similar tool-name filter. `pr-template-reminder` runs on `UserPromptSubmit`. `audit-log` runs on `PostToolUse` + `PostToolUseFailure` + `SubagentStart` + `SubagentStop` (it reads `hook_event_name` and adapts its log format — `tool_name` for tool calls, `subagent:<agent_type>` for subagent events). `notify` + `lint-after-edit` run on `PostToolUse`. `config-change-audit` runs on `ConfigChange`. `compact-reinject` on `PreCompact`. `session-to-obsidian` on `Stop`. The match string decides which hook fires for which tool — see `.claude/settings.json` for the live mapping.

The 19 events we don't wire are documented for completeness in hooks/README.md but aren't load-bearing today. Likely-next candidates if we want to extend: `PostCompact` (counterpart to our existing `PreCompact`), `WorktreeCreate` / `WorktreeRemove` (only relevant if we start using worktrees regularly), `TaskCreated` / `TaskCompleted` (if background task usage picks up).

---

## Where to add new behavior

Choose by what the new thing produces.

| New thing produces | Add it where |
|---|---|
| A Slack post in house format | New `.claude/commands/<name>.md` + a prompt file in `prompts/` if the data pull is complex |
| A branded `.docx` report | New `.claude/commands/<name>.md` + `reports/<name>.js` (copy an existing report as a template) + a `prompts/<area>-report-template.md` if you don't already have one for that area |
| A read-only briefing | New `.claude/commands/<name>.md` only — no `reports/`, no `prompts/` unless instructions are long |
| A safety check at commit time | New `hooks/<name>.py` + register in `.claude/settings.json` under `PreToolUse` with a `Bash` matcher; add a test in `tests/hooks/test_<name>.py` |
| Per-user config (an ID, a key, a flag) | Add to the CLAUDE.md template at the repo root (under `## My CS Ops Settings`) + to `/setup` + to `/check-setup` validator |

See [COMMAND_GUIDE.md](COMMAND_GUIDE.md) for the full add-a-command runbook with frontmatter examples.

---

## What this doc does NOT cover

- Per-command behavior — see the individual files under `.claude/commands/`
- House style / accuracy rules — see [CLAUDE.md](../CLAUDE.md)
- Hook source-code details — see `hooks/README.md`
- GitHub-side security settings — see [github-repo-audit.md](github-repo-audit.md)
- The CS content library (`slabstack-cs/`) — that's content, not code

Refresh this doc when a new command archetype appears, a new top-level directory lands, or the data/out contract changes.
