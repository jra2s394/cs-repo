# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Claude Code reads this file every session. Edit it to change how Claude works.

---

## Who I am

[Your Name] — [Your Title] at [Your Company].
[Your time zone]. Based in [Your Location].
Email: [your-email@company.com]

My role: [Brief description of your CS ops role and primary responsibilities — e.g., Customer Success Operations, building scalable resources that reduce time-to-value for customers and support the sales and CS teams.]

---

## What this repo does

Two things:

1. **Standup updates** — generates my Slack standup posts on demand by pulling live data from connected services and assembling them in my house format. Four update types:
   - **Daily** — yesterday's wins + today's goals (Tue-Fri)
   - **Midweek** — Mon-today wins + rest of week (Wed)
   - **EOW** — full week wins + carryover + next week goals (Fri)
   - **Week Start** — last week's carryover + this week's goals (Mon)

2. **CS content** — the `slabstack-cs/` directory holds onboarding scripts, KB articles, QBR templates, pre-sales docs, integration guides, and the customer master.

---

## Slash commands

All commands live in `.claude/commands/`. Invoke with `/command-name`.

**Standup updates**

| Command | When |
|---|---|
| `/daily` | Tue–Fri — yesterday + today (terse format) |
| `/midweek` | Wed — Mon–today wins + rest of week (house format) |
| `/eow` | Fri — full week recap + carryover + next week (house format) |
| `/weekstart` | Mon — last week carryover + this week goals (house format) |

**Intercom reports** — pull live Intercom data, generate a JSON metrics file, then run `node reports/intercom-<period>.js <path-to-metrics.json>` to produce a `.docx` in `out/`

| Command | Period |
|---|---|
| `/intercom-daily` | Today vs yesterday |
| `/intercom-weekly` | This week vs last week |
| `/intercom-monthly` | This month vs last month |
| `/intercom-quarterly` | This quarter vs last quarter |
| `/intercom-yeartodate` | Full year to date |

**Utilities**

| Command | What it does |
|---|---|
| `/customer` | Full snapshot before a call — open tickets, recent email, meetings, Asana tasks |
| `/escalate` | Escalate an Intercom conversation to a Shortcut ticket (draft → approval → create) |
| `/tasks` | View/manage Asana tasks grouped by urgency |
| `/kb-draft` | Draft a new Intercom KB article from a topic or conversation ID |

**Onboarding reports** — upload the finance mastersheet first, then run the command to generate a branded `.docx` in `out/`. Data sources: mastersheet (CARR) + Asana (task health).

| Command | Period |
|---|---|
| `/onboarding-weekly` | This week vs last week |
| `/onboarding-monthly` | This month vs last month + QTD context |
| `/onboarding-quarterly` | This quarter vs last quarter + YTD context |
| `/onboarding-yearly` | Full year to date + multi-year + all-time totals |

**Renewal reports** — upload the Finance renewals sheet (monthly Excel file from Finance), then run the command to generate a branded invoice report `.docx` in `out/`. Used to tell Finance what amount to invoice each customer. Handles two billing models automatically: volume-based (quantity × per-unit cost) and fixed-rate (ARR × uplift rate).

| Command | What you get |
|---|---|
| `/renewals-thismonth` | This month's invoice detail — what Finance bills now |
| `/renewals-nextmonth` | Next month's pipeline — confirm renewals before month end |
| `/renewals-nextquarter` | Full quarter pipeline — three-month invoice forecast, grouped by month |

Renewal billing models:
- **Volume-based**: Quantity (projected cubic yards/meters) × Per Unit Cost = Invoice Amount
- **Fixed-rate**: Current ARR × (1 + uplift rate, e.g. 1.05) = Invoice Amount
- Claude detects the model automatically from the Finance sheet columns.

---

## Read.ai integration

Read.ai has no MCP server. After each recorded meeting it emails a report to Gmail. Search `from:e.read.ai` for yesterday's date range to get summaries, action items, and per-chapter topics. Treat these as the authoritative transcript source — they override inferred wins from calendar + email alone. Internal 1:1s may not be recorded; fall back to calendar + email in that case.

---

## Active hooks

These hooks run automatically. Know what they block:

| Hook | Blocks / does |
|---|---|
| `branch-enforcer.py` | Blocks `git commit` directly on `main` or `master` — must be on a feature branch |
| `push-guard.py` | Blocks `git push --force` / `-f`, direct pushes to `main`/`master`, `gh pr merge`, and Bash-level writes to `.env` files (bare and directory-prefixed, e.g. `> config/.env`); allows `.envrc` (direnv) |
| `block-attribution.py` | Blocks commits containing AI attribution strings (`Co-Authored-By: Claude`, etc.) |
| `draft-before-create.py` | Forces a permission prompt before creating or mutating items in Slack, Asana, Intercom, Shortcut — covers all write/delete/update operations including Shortcut stories, epics, iterations, documents, and task mutations |
| `file-protector.py` | Blocks edits to `.env` and `.env.*` files (but not `.envrc`), private keys, and named credential files via Edit/Write tools |
| `compact-reinject.py` | Re-injects critical rules from this file when context compacts mid-session |
| `audit-log.py` | Logs every tool call to `~/.claude/tool-audit.log` (PostToolUse, non-blocking) |
| `session-to-obsidian.py` | Exports session transcript to Obsidian vault on session end (async); set `OBSIDIAN_VAULT` env var or run `install.sh` to configure the vault path |

---

## Intercom admin IDs

Use these when filtering conversations to a specific teammate.

| Name | ID |
|---|---|
| [Your Name] | `YOUR_INTERCOM_ID` |
| [Teammate 1] | `TEAMMATE_1_ID` |
| [Teammate 2] | `TEAMMATE_2_ID` |
| [Teammate 3] | `TEAMMATE_3_ID` |

---

## Connected services (MCP)

- Gmail
- Google Calendar
- Asana
- Slack
- Intercom
- Google Drive
- Shortcut

If anything isn't connected, run `/mcp` in the Claude Code prompt to see status.

---

## Tools

| Tool | Purpose |
|---|---|
| **Gmail** | Work email |
| **Google Calendar** | Meetings, customer calls, go-live dates |
| **Asana** | Project and task management for CS ops work |
| **Intercom** | Knowledge base articles, customer messaging, support conversations |
| **Slack** | Standup posts, team communication |
| **Google Drive** | Docs and shared files |
| **Shortcut** | Bug and feature tracking; escalation to product/eng |

---

## Git Workflow

All changes follow the feature-branch PR flow. Direct commits and pushes to `main` are blocked at two levels: local hooks (Claude Code) and GitHub branch protection rules (server-side).

1. **Branch** — `git checkout -b <descriptive-name>` from main
2. **Commit** — `git commit` (blocked on `main`; must be on a feature branch)
3. **Push** — `git push -u origin <branch-name>` (pushes to feature branch only)
4. **PR** — open a pull request on GitHub; use the PR template
5. **Merge** — squash and merge via GitHub web UI

Branch naming: `chore/`, `fix/`, `feature/`, or `docs/` prefix + short description.

### GitHub branch protection rules (main)

Configured server-side at `github.com/jra2s394/cs-repo/settings/branches`:

| Rule | Setting |
|---|---|
| Require pull request before merging | ✅ on |
| Required approvals | 0 (solo repo) |
| Allow force pushes | ❌ off |
| Allow branch deletion | ❌ off |
| Require linear history | ✅ on (squash/rebase only) |
| Enforce for admins | ❌ off (escape hatch retained) |

These rules apply even when pushing from your own terminal — GitHub rejects the push before it lands.

---

## Hard Rule: Draft Before Any Action

**Never create, post, send, or publish anything to Intercom, Asana, Shortcut, Slack, or any external system without explicit approval.**

Process (no exceptions):

1. **Draft** the full content in the conversation.
2. **Present** it to the user for review.
3. **Wait** for explicit approval ("looks good", "post it", "create it").
4. **Only then** take the action.

This applies to: standup posts, KB articles, article edits, Asana tasks, Shortcut tickets, Slack messages, and any comments or updates on existing items.

---

## Accuracy Rules — NON-NEGOTIABLE

I have been burned by hallucinated wins. Follow these strictly:

1. **Never claim a meeting happened without a calendar event confirming it.**
2. **Never claim a go-live, milestone, or deliverable happened without explicit inbox confirmation** (sent email from me, accepted invite, or customer reply).
3. **If a status is unclear, flag it 🔴** with "status unclear — needs confirmation". Do not paper over silence with optimistic language.
4. **Cross-reference prior updates** so carryover stays consistent.
5. **All times in Mountain Time** unless specifically noted otherwise.
6. **Use the indicator system:**
   - 🔴 critical / blocker / unclear
   - 🟡 watch item / in progress
   - 🟢 resolved / on track
7. **Numbers must come from tool calls, not estimates.** If you can't pull a count, say so — don't invent it.
8. **Quote senders/recipients exactly** when summarizing email threads.

---

## Format House Style

Two formats, by update type.

**Daily** — terse; posts straight to Slack. No opener. Title line, then three sections:

```
*Daily Update — [Weekday], [Month Day]*

*Yesterday:*
• [...]

*Today:*
• [...]

*Blockers:*
• [...]
```

**Midweek / EOW / Week Start** — the fuller house format; starts with:

```
How are you feeling? (1-10) 🧘
[I'll fill in]

@your-slack-handle is excited about:
- [2-3 highlights from this period]

🎉 :slab: :party_gopher:
```

Then the period-specific body (see `prompts/*.md`).

All update types: end the message to me with —

> "Want me to drop this in Slack as a draft, or tweak anything?"

---

## Content Standards

### Knowledge Base Articles (Intercom)

- Lead with the outcome the customer is trying to achieve, not the feature name.
- Use numbered steps for procedures; bullets for reference lists.
- Keep sentences short — Slabstack customers are in the field, often on mobile.
- Every article needs: a clear title, a one-sentence intro, step-by-step body, and a "next steps" or related articles section.
- Tag articles by product area and customer segment before publishing.

### Onboarding Videos

- Script before recording. Draft the script in conversation for review first.
- Each video covers exactly one workflow — no multi-topic videos.
- Include a written companion article in Intercom for every video.

### Pre-Sales Docs

- Audience is the buyer, not the end user. Lead with business outcomes and ROI, not feature lists.
- Use Slabstack's concrete industry terminology (mix designs, batch tickets, plant operations, etc.).
- Confirm the target persona and deal stage before drafting.

### Integration Guides

- Always specify the third-party system by name and version if known.
- Structure: Overview → Prerequisites → Step-by-step setup → Troubleshooting → Support contact.
- Flag any steps that require IT or admin access so the customer can prepare.

---

## Issue Triage Workflow

When a customer issue or bug is reported:

1. **Search Shortcut first** — look for existing tickets by symptom, feature area, or customer name.
2. **Report what exists** — surface status, owner, and any workarounds immediately.
3. **Only escalate** if no ticket exists or the user asks for deeper investigation.

When creating a new Shortcut ticket, always draft it in conversation first.

---

## Key People

**Leadership / managers:**
- [Manager Name] — my manager
- [Peer 1] — peer
- [Peer 2] — peer
- [Ops/HR contact] — Ops/HR

**My team (CS):**
- [CSM 1] — CSM
- [CSM 2] — CSM
- [CS Engineer 1] — CS engineer
- [CS Engineer 2] — CS engineering (integrations)
- [CS Engineer 3] — CS engineering (integrations)
- [Reporting contact] — reporting/dashboards

**Sales / AEs:**
- [AE Name] — AE

**Product / engineering:**
- [Product lead] — product/engineering lead
- [Eng contact] — engineering

---

## Recurring Customers / Projects

Add your recurring customer accounts here with primary contacts.
Format: Company Name (Contact 1, Contact 2), ...

Example:
Acme Concrete (Jane Smith, Bob Jones), Regional Ready Mix (Tom Brown), ...

---

## MCP Precision Notes

- **Gmail:** `search_threads` with `is:unread` for unread count. Use `newer_than:1d -in:draft` for last 24h. Use `after:YYYY/MM/DD -in:draft -category:promotions -category:social` for date ranges.
- **Calendar:** `list_events` requires explicit ISO 8601 `startTime` and `endTime` bounding the full day range (e.g., `2026-05-15T00:00:00` to `2026-05-15T23:59:59`).
- **Intercom:** `search_conversations()` requires at least one filter parameter — use `created_at >= timestamp`. **Exception:** `/intercom-yeartodate` intentionally makes an unbounded all-time pull to compute workspace totals; that is the only command where no date filter is correct.
- **MCP config:** each server object requires all three fields — `type`, `url`, AND `name`. Missing `name` silently fails.
- **Latency:** calling many MCP servers at once is slow. For testing, use Gmail + Calendar + Asana only.

---

## Definitions

- **Email unread count** = total unread right now (not last 24h)
- **Email received** = unique emails across all folders, deduplicated by Message-ID
- **Slack count** = 1-on-1 DM conversations only (not group DMs, not channels)
- **Channels posted** = unique channel IDs where my user ID sent at least one message

---

## Repo Structure

```
cs-repo/
├── CLAUDE.md                  — this file
├── .mcp.json                  — MCP server config
├── .claude/commands/          — slash commands (/daily, /midweek, /eow, /weekstart)
├── prompts/                   — standup prompt templates
├── data/outputs/              — generated standup updates land here
├── slabstack-cs/              — CS content library
│   ├── onboarding/            — self-serve video scripts and checklists
│   ├── presales/              — discovery decks, objection handling, ROI templates
│   ├── integrations/          — integration setup guides
│   ├── kb-articles/           — knowledge base articles (Intercom-ready)
│   ├── customer-master/       — master customer tracker
│   └── qbr-templates/        — quarterly business review templates
├── hooks/                     — Claude Code hooks (audit, safety, notifications)
├── skills/                    — reusable Claude Code skill definitions
├── patterns/                  — Claude Code patterns and best practices
├── docs/                      — documentation and templates
└── examples/                  — before/after examples and session transcripts
```
