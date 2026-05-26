# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Claude Code reads this file every session. Edit it to change how Claude works.

---

## Who I am

[Your Name] — [Your Title] at [Your Company].
[Your time zone — IANA name, e.g. `America/Denver`]. Based in [Your Location].
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

All commands live in `.claude/commands/<name>.md`. Each file's YAML frontmatter has a `description:` field — that's the authoritative source. Run `/commands` for a live grouped listing, or see USER_GUIDE.md for the per-command walkthroughs.

The 44 commands (registered here so the round-60 parity test catches new files that miss CLAUDE.md): `/at-risk`, `/check-setup`, `/commands`, `/customer`, `/customer-search`, `/daily`, `/end-onboarding`, `/eow`, `/escalate`, `/executive-summary`, `/expansion`, `/follow-up`, `/go-live`, `/handoff`, `/health-score`, `/inbox-triage`, `/intercom-daily`, `/intercom-monthly`, `/intercom-quarterly`, `/intercom-weekly`, `/intercom-yeartodate`, `/kb-draft`, `/meeting-notes`, `/meeting-prep`, `/midweek`, `/my-tasks` (renamed from `/tasks` in round 60), `/onboarding-monthly`, `/onboarding-quarterly`, `/onboarding-status-report`, `/onboarding-weekly`, `/onboarding-yearly`, `/prs`, `/qbr`, `/renewal-health`, `/renewals-nextmonth`, `/renewals-nextquarter`, `/renewals-thismonth`, `/review-code`, `/setup`, `/standup-recap`, `/start-onboarding`, `/story-CSEng`, `/weekly-team`, `/weekstart`.

Report-style commands (`/intercom-*`, `/onboarding-*`, `/renewals-*`) generate branded `.docx` files in `out/` after the user uploads a Finance mastersheet first. Renewal billing handles both **volume-based** (quantity × per-unit cost) and **fixed-rate** (ARR × uplift rate) — Claude detects the model from the Finance sheet columns.

> **Don't confuse `/review-code` with the bundled `/code-review` skill.** `/review-code` (ours, in `.claude/commands/`) runs `make test` + `make lint` + the 23-section repo-specific checklist for hooks/lib/reports/commands; round-79 also wired it to the `code-reviewer` subagent. Anthropic also ships a bundled `/code-review` skill that does a generic diff review. They're separate commands with separate behaviors — type the exact name you mean. If you want to hide the bundled one, run `/skills`, highlight `code-review`, and press Space to cycle to `"off"` (the menu writes to `.claude/settings.local.json`, per-user and gitignored).

---

## Read.ai integration

Read.ai has no MCP server. After each recorded meeting it emails a report to Gmail. Search `from:e.read.ai` for yesterday's date range to get summaries, action items, and per-chapter topics. Treat these as the authoritative transcript source — they override inferred wins from calendar + email alone. Internal 1:1s may not be recorded; fall back to calendar + email in that case.

---

## Active hooks

These hooks run automatically. Know what they block:

| Hook | Blocks / does |
|---|---|
| `branch-enforcer.py` | Blocks `git commit` directly on `main` or `master` — must be on a feature branch |
| `push-guard.py` | Blocks `git push --force` / `-f`, direct pushes to `main`/`master`, `gh pr merge`, `gh repo edit --visibility public` (private→public flip), and Bash-level writes to `.env` files (bare and directory-prefixed, e.g. `> config/.env`); allows `.envrc` (direnv) |
| `block-attribution.py` | Blocks commits containing AI attribution strings (`Co-Authored-By: Claude`, etc.) |
| `secret-scan.py` | Blocks `git commit` when staged content matches a known token pattern (Shortcut, GitHub, OpenAI legacy + project keys, Anthropic, Stripe live, Twilio, GCP service account, Slack `xox[abcdepsr]-`, AWS access key + secret, Google API, RSA private key, JWT). Stripe test keys warn but do not block. |
| `draft-before-create.py` | Forces a permission prompt before creating or mutating items in Slack, Asana, Intercom, Shortcut, Gmail, Google Calendar, and Google Drive — covers write/update operations including Shortcut stories, epics, iterations, documents, and task mutations. (Destructive deletes are gated separately by `permissions.deny`, not this hook.) |
| `file-protector.py` | Blocks Edit/Write to `.env` and `.env.*` (but not `.envrc`), private keys (`.pem`/`.key`/`.p12`/`.pfx`), named credential files (`id_rsa`, `credentials.json`, `service-account.json`, `.mcp.json`, etc.), and anything inside `.git/` |
| `pr-template-reminder.py` | When you submit a prompt about creating or opening a PR (or one mentioning `gh pr create`), injects context telling Claude to read `.github/pull_request_template.md` and match its structure |
| `compact-reinject.py` | Re-injects critical rules from this file when context compacts mid-session |
| `audit-log.py` | Logs every tool call (PostToolUse), tool failure (PostToolUseFailure), and subagent lifecycle event (SubagentStart, SubagentStop — wired round 85) to `~/.claude/tool-audit.log`. Non-blocking. |
| `lint-after-edit.py` | After Claude edits a `.py` or `.js` file (PostToolUse Edit\|Write), runs `ruff` or `biome` on it and prints any findings to stderr. Non-blocking — surfaces lint feedback at edit-time instead of waiting for CI. |
| `config-change-audit.py` | Logs every config-file change (ConfigChange event — `.claude/settings.json`, `~/.claude/settings.json`, skill/agent frontmatter) to `~/.claude/config-change.log`. Non-blocking forensic trail for post-incident review. |
| `notify.py` | Plays a sound / shows a notification when Claude needs your attention |
| `session-to-obsidian.py` | Exports session transcript to Obsidian vault on session end (async); set `OBSIDIAN_VAULT` env var or run `install.sh` to configure the vault path |

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

## Subagents (`.claude/agents/`)

Custom subagents are markdown files with YAML frontmatter that Claude Code can delegate side tasks to — each runs in its own context window and returns only the summary. Use `/agents` to manage them.

| Subagent | When it fires | Tools |
|---|---|---|
| `code-reviewer` | When the user runs `/review-code` or asks for a structured code review. Walks the 23-section checklist from `.claude/commands/review-code.md`. | Read, Grep, Glob, Bash — no write tools, no MCP |

Frontmatter contract is enforced by `tests/test_agents_frontmatter.py`: every agent file must have `description` (≥40 chars, used by Claude's routing), `tools` (explicit allowlist), and `model` fields.

---

## Trusted infrastructure

This section steers Claude Code's [auto-mode classifier](https://code.claude.com/docs/en/auto-mode-config). The classifier reads CLAUDE.md to learn what's internal to this workflow versus what should be treated as external. Writing this in plain prose — like onboarding a new engineer — reduces false-positive auto-mode prompts when Claude does routine internal work.

**Organization.** [Your Company] customer success operations. Claude Code is the AI assistant for CS ops work (standups, customer reports, knowledge base articles, meeting prep, follow-ups). All external writes flow through the seven MCPs listed in "Connected services" above — no other external systems are touched.

**Source control.** GitHub. The only remote pushed to is the one configured in `.git/config`. Force pushes and direct commits to `main` are blocked at two layers (`hooks/push-guard.py` locally + GitHub branch protection server-side).

**Trusted external services.** The seven MCPs above (Gmail, Calendar, Drive, Asana, Intercom, Slack, Shortcut), accessed via the user's own work-account credentials. Write operations always go through `hooks/draft-before-create.py` — no command sends or posts without explicit user approval per draft.

**Trusted local paths.** `data/outputs/` (generated standup `.md` files), `out/` (generated `.docx` reports), `~/Desktop/CS Reports/` (optional Desktop copy of reports), `/tmp/` (scratch). The repo working tree itself gets normal source-control treatment.

**Trusted network endpoints.** Pre-allowed in `.claude/settings.json::sandbox.network.allowedDomains`: `github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, `code.claude.com`, `anthropic.com`. Other domains trigger a one-time approval prompt on first use.

**Explicitly not trusted.** Any URL or service not listed above is treated as external. Credential directories (`~/.ssh`, `~/.aws`, `~/.gnupg`) are blocked by the sandbox's `denyRead`. Generic exfiltration targets (pastebins, arbitrary webhooks, gists, third-party code-review APIs) get auto-mode prompts before they're touched.

---

## Git Workflow

All changes follow the feature-branch PR flow. Direct commits and pushes to `main` are blocked at two levels: local hooks (Claude Code) and GitHub branch protection rules (server-side).

1. **Branch** — `git checkout -b <descriptive-name>` from main
2. **Commit** — `git commit` (blocked on `main`; must be on a feature branch)
3. **Push** — `git push -u origin <branch-name>` (pushes to feature branch only)
4. **PR** — open a pull request on GitHub; use the PR template
5. **Merge** — squash and merge via GitHub web UI

Branch naming: `chore/`, `fix/`, `feature/`, or `docs/` prefix + short description.

GitHub branch protection on `main` is configured server-side (PR-required, force-push-blocked, linear history). The full settings live in [docs/github-repo-audit.md](docs/github-repo-audit.md). GitHub rejects bad pushes before they land, so the local hooks + remote rules form a two-layer guard.

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

## System Action Policy — Read, Suggest, Draft Only

This is a CS Ops intelligence tool. It reads data, surfaces insights, and drafts content for human review. **It does not complete, close, delete, or change the state of items in external systems.** Users perform those actions themselves in Asana, Shortcut, Intercom, and their other tools.

### What Claude does and does not do per system

| System | Claude DOES | Claude does NOT do |
|---|---|---|
| **Asana** | Pull tasks, surface blockers, suggest next actions, create NEW tasks (draft-first) | Mark tasks complete, update task status, delete tasks |
| **Shortcut** | Pull story status, surface waiting PRs, create NEW stories (draft-first) | Update workflow state, close/complete stories, delete stories/epics/iterations |
| **Intercom** | Pull conversations, surface open issues, create/update KB articles (draft-first) | Close or resolve conversations |
| **Slack** | Draft and post standup updates (draft-first), post onboarding resource links (approval required) | Archive channels, manage membership |
| **Gmail** | Search threads, surface action items, create email drafts | Send email, archive, or delete |
| **Google Calendar** | Pull events, suggest meeting times, create/update events (draft-first) | Delete calendar events |
| **Google Drive** | Read files, create new files and folders (approval required for `/start-onboarding`) | Delete files or folders |

### How to handle completion and status changes

When a task, story, conversation, or item should be updated or completed:

1. **Tell the user what action to take** — e.g., "You can mark 'Configure dispatch integration' complete in Asana."
2. **Provide the direct link** if available from the API response.
3. **Never attempt the update yourself** — not even with draft-before-create — unless the user explicitly says "do it" after reviewing a draft.

**Asana specifically:** Show task lists, flag overdue items, suggest what to mark complete. Never call `update_tasks` for completion. The user marks tasks done in Asana.

**Shortcut specifically:** Show story states and waiting PRs. Suggest what the next workflow state should be. Never call `stories-update` to change workflow state. The user moves stories in Shortcut.

**Intercom conversations:** Surface open and overdue conversations. Never close or resolve a conversation. The user resolves in Intercom.

---

## Accuracy Rules — NON-NEGOTIABLE

I have been burned by hallucinated wins. Follow these strictly:

1. **Never claim a meeting happened without a calendar event confirming it.**
2. **Never claim a go-live, milestone, or deliverable happened without explicit inbox confirmation** (sent email from me, accepted invite, or customer reply).
3. **If a status is unclear, flag it 🔴** with "status unclear — needs confirmation". Do not paper over silence with optimistic language.
4. **Cross-reference prior updates** so carryover stays consistent.
5. **All times in your local time zone** (the IANA name set in `~/.claude/CLAUDE.md` per `/setup`) unless specifically noted otherwise.
6. **Use the indicator system:**
   - 🔴 critical / blocker / unclear
   - 🟡 watch item / in progress
   - 🟢 resolved / on track
7. **Numbers must come from tool calls, not estimates.** If you can't pull a count, say so — don't invent it.
8. **Quote senders/recipients exactly** when summarizing email threads.

---

## Format and content standards

Two reference docs Claude reads when actually drafting (rather than every session):

- [docs/STANDUP_FORMAT.md](docs/STANDUP_FORMAT.md) — house format for `/daily`, `/midweek`, `/eow`, `/weekstart` (terse Daily vs. fuller Midweek/EOW/Weekstart shape, the closing line).
- [docs/CONTENT_STANDARDS.md](docs/CONTENT_STANDARDS.md) — standards for the four content types: KB articles (Intercom), onboarding video scripts, pre-sales docs, integration guides.

---

## Issue Triage Workflow

When a customer issue or bug is reported:

1. **Search Shortcut first** — look for existing tickets by symptom, feature area, or customer name.
2. **Report what exists** — surface status, owner, and any workarounds immediately.
3. **Only escalate** if no ticket exists or the user asks for deeper investigation.

When creating a new Shortcut ticket, always draft it in conversation first.

---

Personal placeholder sections (Intercom admin IDs, Asana Team GID, Key People, Recurring Customers) live in [docs/templates/CLAUDE_MD_PERSONAL_TEMPLATE.md](docs/templates/CLAUDE_MD_PERSONAL_TEMPLATE.md). Copy the relevant blocks into your personal `~/.claude/CLAUDE.md` and fill them in — SETUP.md has the step-by-step. The project CLAUDE.md (this file) stays focused on rules and identity.

MCP query gotchas (date filters, latency, per-server quirks) live in [docs/MCP_PRECISION_NOTES.md](docs/MCP_PRECISION_NOTES.md). Claude reads it on demand when a query misbehaves.

---

## Definitions

- **Email unread count** = total unread right now (not last 24h)
- **Email received** = unique emails across all folders, deduplicated by Message-ID
- **Slack count** = 1-on-1 DM conversations only (not group DMs, not channels)
- **Channels posted** = unique channel IDs where my user ID sent at least one message

---

Repo structure is self-evident from `ls` and explained in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
