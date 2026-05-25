---
description: Pull a briefing for every customer meeting in the next 24 hours — one screen per meeting, no context switching required.
---

Read `CLAUDE.md` from this repo before starting.

Prepare me for every customer meeting coming up in the next 24 hours. One brief per meeting, pulled in parallel, ordered by start time.

---

## Step 1 — Pull today's and tomorrow's calendar

Use `list_events` for the next 24 hours in your local time zone (the IANA name set in `~/.claude/CLAUDE.md`).

Filter to events that look like customer calls. To distinguish internal from external attendees, read the `INTERNAL_EMAIL_DOMAIN` environment variable (e.g. `acme.com`). If it is unset, ask the user for their company's email domain and proceed.

- External attendees: any attendee whose email domain is not `$INTERNAL_EMAIL_DOMAIN`
- Title contains a customer name, "call", "kickoff", "training", "onboarding", "QBR", "check-in", or "review"

Skip internal-only meetings (every attendee's email domain matches `$INTERNAL_EMAIL_DOMAIN`).

If no customer meetings are found in the next 24 hours, say so and stop.

---

## Step 2 — For each meeting, pull context in parallel

For each qualifying meeting, simultaneously search:

**Intercom:**
- Open conversations for this customer
- Any conversation in the last 14 days

**Gmail:**
- Threads with this customer in the last 14 days
- Any thread with "go-live", "issue", "question", "help" in the subject
- Search `from:e.read.ai` for a Read.ai report from the last meeting with this customer

**Asana:**
- Open tasks for this customer

**Shortcut:**
- Open stories mentioning this customer

---

## Step 3 — Format one brief per meeting

For each meeting, output:

```
─────────────────────────────────────────────
[Time MT] — [Meeting Title]
Attendees: [names and companies]
─────────────────────────────────────────────

Context:
[One sentence: where is this customer in the lifecycle]

Open items:
• [Intercom: open conversations — topic and age]
• [Asana: open tasks — name and due date]
• [Shortcut: open stories — ID, title, state]

Last contact:
• [Most recent email or meeting — date and one-line summary]
• [Read.ai: if a report exists for a prior meeting, summarize key action items]

Watch:
🔴 [Any blocker, overdue item, or unanswered question]
```

---

## Rules

- If a source returns nothing for a customer, say "none found" — don't skip the section
- Never claim a prior meeting happened without a calendar event confirming it
- Read.ai reports override inferred meeting outcomes
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
- If any MCP tool is unavailable, note it and continue with what you have
