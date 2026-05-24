---
description: Read-only post-meeting summary — captures key points, decisions, action items, and customer signals from a meeting you just had, without sending an email. Counterpart to /follow-up.
---

Read `CLAUDE.md` from this repo before starting.

Pull a structured summary of a meeting that just ended. Unlike `/follow-up`, this command does NOT draft or send anything — it's for the case where you just want notes to file (for your records, for a teammate, for a future QBR, or to paste into Asana/Shortcut).

**Read-only.** Never drafts an email. Never creates a task. Never updates a story. Never sends a Slack message.

---

## Step 1 — Identify the meeting

Ask: "Which meeting? You can give me a customer name, a meeting title, or I'll find your most recently completed meeting."

If no meeting is specified, use `list_events` to find the most recently completed meeting with external attendees (ended in the last 6 hours). Show it and ask: "Is this the right meeting?"

If the user specifies a customer name, find the most recent completed meeting with that customer (last 14 days).

If you can't find a matching meeting, say so and stop — never invent a meeting from inference.

---

## Step 2 — Pull the meeting context

Run these in parallel:

**Read.ai (via Gmail) — primary source:**
- Search `from:e.read.ai` for a report matching the meeting's date and attendees
- Extract: summary, decisions, action items (with owners), per-chapter topics if available

**Calendar:**
- The event itself — title, attendees (internal + external), duration, location/video link

**Gmail (last 14 days with this customer):**
- Pre-meeting threads to understand what was on the table going in
- Post-meeting threads (since the meeting ended) — sometimes recaps or follow-ups have already happened from the other side

**Asana:**
- Open tasks for this customer (so action items can be cross-referenced — "this matches existing task X" vs "this is new")

**Shortcut:**
- Open stories for this customer (same — match existing work)

If no Read.ai report exists, flag it: 🔴 **No Read.ai report found — notes derived from calendar + email context only. Treat with lower confidence.**

---

## Step 3 — Present the notes

Format:

```
## Meeting Notes — <Customer> — <Date>

**Meeting:** <event title>
**When:** <date>, <start>–<end> MT (<duration>)
**Attendees:**
- <Customer>: <names>
- Slabstack: <names>
**Source:** Read.ai report  |  Calendar + email only (flag if no Read.ai)

---

### Summary
<2–3 sentences covering what was discussed, from Read.ai if available, otherwise from calendar/email context>

### Decisions
- <decision 1>
- <decision 2>
(If none: "No explicit decisions captured.")

### Action items
| Action | Owner | Due | Status |
|---|---|---|---|
| <action> | <name> | <date or "TBD"> | New / Matches existing Asana task X / Already done |

For each action item, cross-reference Asana and Shortcut:
- If it matches an open Asana task → note the task name + URL
- If it matches an open Shortcut story → note the story id + state
- If it's new → mark as "New" (and Claude offers to draft a task in Step 4)

### Customer signals 🟡
Quote any of these verbatim from the meeting (if Read.ai captured them):
- Competitor mentions
- Expansion language (new plants, regions, volume)
- Risk language (frustration, churn talk, contract objections)
- Renewal language

(If none: "No notable customer signals captured.")

### Open questions / parking lot
- <anything that came up but wasn't resolved>

### Source files
- Read.ai email: <subject> (or "not found")
- Calendar event: <title>
- Related Gmail threads: <count>
- Related Asana tasks: <count>
- Related Shortcut stories: <count>
```

---

## Step 4 — Offer follow-up actions (opt-in, not auto)

After the notes, present a menu — DO NOT execute any of these automatically:

> "Want me to:
> 1. Save these notes to `slabstack-cs/meeting-notes/<customer>-<date>.md`?
> 2. Draft a follow-up email (`/follow-up` workflow)?
> 3. Draft new Asana tasks for the action items I marked 'New'?
> 4. Draft a Shortcut story for anything that looks like an eng escalation?
>
> Or just type 'done' if you have what you need."

For #1 — saving to disk is the only action `/meeting-notes` will take itself, and only after explicit "yes save". The file goes to `slabstack-cs/meeting-notes/` (create the directory if it doesn't exist).

For #2, #3, #4 — defer to the existing commands (`/follow-up`, `/tasks`, `/story-CSEng`, `/escalate`). Never call those workflows from inside `/meeting-notes` — let the user invoke them so they remain in control.

---

## Rules

- **Read-only by default.** Saving notes to disk only happens after explicit "yes save".
- **Never invent a meeting.** If the user says "the [CUSTOMER_A] call" and you can't find it on the calendar, say so and stop — don't proceed from inference.
- **Read.ai is authoritative when present.** If Read.ai says X and the calendar suggests Y, go with X and note the discrepancy.
- **Quote signals verbatim.** Customer signals must be direct quotes (no paraphrasing, no inferring). If you didn't see the exact phrase, don't list it.
- **Cross-reference, don't duplicate.** If an action item already exists as an Asana task, say so — don't propose creating a duplicate.
- All times in Mountain Time.
- If Gmail or Calendar MCP is unavailable, say which one and stop (can't reliably summarize without those).
