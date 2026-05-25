---
description: After a customer call, draft a follow-up email with action items — pulls from Read.ai report and calendar, drafts for approval before sending.
---

Read `CLAUDE.md` from this repo before starting.

Draft a follow-up email after a customer call. Always drafts for review — never sends without explicit approval.

---

## Step 1 — Identify the meeting

Ask: "Which meeting are you following up on? You can give me the customer name, or I'll look at your most recent completed meeting."

If no meeting is specified, use `list_events` to find the most recently completed meeting with external attendees (ended in the last 4 hours). Show it and ask: "Is this the right meeting?"

---

## Step 2 — Pull the meeting context

Once the meeting is confirmed, run in parallel:

**Read.ai (via Gmail):**
Search `from:e.read.ai` for a report matching this meeting's date and customer name. This is the primary source.
- Extract: summary, action items with owners, any decisions made

**Gmail:**
- Any pre-meeting email threads with this customer (last 14 days) — for context on open items going in

**Asana:**
- Open tasks for this customer — surface any that were discussed or need updating after the call

**Shortcut:**
- Open stories for this customer — any that need a status update based on what was discussed

If no Read.ai report is found, note that and draft from calendar event + email context only. Flag it: 🔴 No Read.ai report found — draft is based on calendar and email context only.

---

## Step 3 — Draft the follow-up email

Draft the email in the conversation for review. Use this format:

```
To: [customer contact(s)]
Subject: Follow-up: [meeting title] — [date]

Hi [name],

Thanks for the time today. Here's a quick summary and next steps from our call:

Summary:
[2–3 sentences covering what was discussed — from Read.ai summary if available]

Action items:
• [Action] — Owner: [name], Due: [date if mentioned]
• [Action] — Owner: [name]

[Optional: any open question or item flagged for follow-up]

Let me know if I missed anything or if you have questions.

[Signature]
```

Present the draft and ask: "Does this look right? Should I send it?"

---

## Step 4 — Send only after approval

Wait for explicit approval ("send it", "looks good", "yes") before sending.

After sending, ask:
- "Should I create Asana tasks for any of these action items?"
- "Should I update any open Shortcut stories based on the call?"

Draft any tasks or updates before creating them.

---

## Rules

- Never send without explicit approval
- Read.ai report outcomes are authoritative — don't contradict them
- If no Read.ai report exists, the draft must be flagged accordingly
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
- If any MCP tool is unavailable, note it and continue
