---
description: List every available slash command, pulled live from .claude/commands/*.md frontmatter — no need to grep CLAUDE.md
allowed-tools: Read Glob
---

Read every `.md` file in `.claude/commands/` and present a complete, grouped inventory of available slash commands. Pull the `description:` line from each file's YAML frontmatter — this is the authoritative source, not CLAUDE.md (which can drift).

This command is read-only and does not call any MCP tools.

---

## Step 1 — Walk the commands directory

List every `*.md` file in `.claude/commands/` (relative to the repo root). For each file:

1. Read the YAML frontmatter (the `---` block at the top)
2. Extract the `description:` field
3. The command name is the filename without `.md` (e.g. `daily.md` → `/daily`)

Skip any file without a frontmatter `description:` and call those out at the bottom as "missing description" so the user knows to fix them.

---

## Step 2 — Group by category

Use these buckets (matching the structure in `CLAUDE.md`):

| Bucket | Commands |
|---|---|
| **Standup updates** | `/daily`, `/midweek`, `/eow`, `/weekstart`, `/standup-recap` |
| **Intercom reports** | `/intercom-daily`, `/intercom-weekly`, `/intercom-monthly`, `/intercom-quarterly`, `/intercom-yeartodate` |
| **Onboarding reports** | `/onboarding-weekly`, `/onboarding-monthly`, `/onboarding-quarterly`, `/onboarding-yearly` |
| **Renewal reports** | `/renewals-thismonth`, `/renewals-nextmonth`, `/renewals-nextquarter` |
| **Customer intelligence** | `/customer`, `/customer-search`, `/inbox-triage`, `/meeting-prep`, `/meeting-notes`, `/follow-up`, `/go-live`, `/at-risk`, `/health-score`, `/expansion`, `/qbr`, `/escalate`, `/story-CSEng`, `/prs`, `/tasks`, `/kb-draft` |
| **Onboarding lifecycle** | `/start-onboarding`, `/onboarding-status-report`, `/end-onboarding`, `/handoff` |
| **Renewal & executive** | `/renewal-health`, `/executive-summary`, `/weekly-team` |
| **Tooling** | `/setup`, `/review-code`, `/commands` |

If you find a command in the directory that isn't in any bucket above, list it under **Uncategorized** at the bottom — that's a signal the inventory is drifting and `/commands` itself or CLAUDE.md needs updating.

---

## Step 3 — Present

Output one section per bucket, in the table order above. Format:

```
## Available commands  (N total)

### Standup updates (5)
| Command | What it does |
|---|---|
| `/daily` | Generate today's daily Slack update |
| ...

### Intercom reports (5)
...

### Uncategorized (M)        ← only show if any exist
| Command | What it does | Action |
|---|---|---|
| `/something-new` | ... | Add to CLAUDE.md and to /commands buckets |
```

Counts in headers must match the actual number listed. End the output with:

```
**Total:** N commands across 8 categories
**Source of truth:** .claude/commands/*.md frontmatter

Need details on a specific command? Run it with no args (most commands ask before doing anything) or read .claude/commands/<name>.md directly.
```

---

## Rules

- **Read-only.** No MCP calls. No git operations. Just file reads.
- **Live, not memorized.** Always re-read the directory — don't cache from prior conversation context. The whole point is to catch new commands that haven't been registered in CLAUDE.md yet.
- **Frontmatter is authoritative.** If a command's CLAUDE.md description differs from its frontmatter, use the frontmatter (the file is the source).
- **Surface drift.** Always call out:
  - Commands in the directory missing from CLAUDE.md's tables
  - Commands without a frontmatter `description:`
  - Commands in CLAUDE.md tables that no longer exist in the directory
