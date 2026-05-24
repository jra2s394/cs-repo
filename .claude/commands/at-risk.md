---
description: Surface all at-risk customers across Asana, Intercom, Shortcut, and Gmail in a single prioritized view — read-only triage.
---

Read `CLAUDE.md` from this repo before starting.

Identify every customer showing risk signals right now. **Read-only — no tasks are created, no messages are sent, no tickets are opened.** This command surfaces risk; the user decides what to act on.

---

## Step 1 — Pull risk signals in parallel

Search all connected systems simultaneously:

**Asana:**
- Tasks more than 7 days overdue across all CS projects
- Milestones with no activity in 14+ days
- Any task flagged with a blocker or critical tag

**Intercom:**
- Open conversations with no response in 72+ hours
- Conversations with angry sentiment tags or escalation flags
- Any conversation marked "urgent" or "critical"

**Shortcut:**
- Stories in "Blocked" state with a customer tag
- Stories in any state for 14+ days with no update
- Any story tagged with a customer name and labeled "critical" or "P0"

**Gmail:**
- Emails from customer domains with no reply in 5+ business days
- Any thread containing words: "frustrated", "unhappy", "cancel", "terminate", "not working", "issue"
- Escalation email threads (CC'd to multiple people, high volume)

**Google Calendar:**
- Customers with no scheduled meeting in the next 30 days AND no meeting in the past 30 days (dark account)

---

## Step 2 — Triage and surface results

Group findings by risk level:

### 🔴 Immediate Attention
- Open Intercom conversations 72h+ with no response
- Cancelled or rescheduled meetings with no rebook
- Customer emails containing escalation language
- Shortcut blockers older than 7 days
- Asana milestones overdue by 14+ days

### 🟡 Watch
- Asana tasks 3–7 days overdue
- Intercom conversations 24–72h without response
- No upcoming meeting scheduled in next 30 days
- Shortcut stories 7–14 days with no update

### 🟢 Just Resolved (last 48h)
- Show anything that was 🔴 but now resolved — give credit and confirm nothing was missed

---

## Step 3 — Present the triage view

Display findings in this format:

```
At-Risk Triage — [Today's Date]

🔴 IMMEDIATE — X items

[Customer]  |  Source: [Intercom/Asana/Shortcut/Gmail]
Issue: [description]
Age: [days]
Recommended action: Tell [customer contact name]: "[specific message suggestion]"
Link: [URL if available]

---

🟡 WATCH — X items

[Customer]  |  Source: [system]
Issue: [description]
Age: [days]

---

🟢 RESOLVED RECENTLY

[Customer] — [what was resolved, when]
```

---

## Step 4 — Offer next actions (suggest only — do not execute)

For each 🔴 item, offer one concrete next step the user can take:
- "Send a check-in email to [contact] — I can draft one if you'd like."
- "Create an Asana task to follow up on [item] — I can draft it for review."
- "Add a Shortcut comment to [story ID] — I can draft it for review."

**Never take any of these actions without explicit approval.**

---

## Rules

- Read-only: never create tasks, post messages, update stories, or send emails in this command
- Every recommendation must be specific: named customer, named action, named next step
- Do not surface internal 1:1s or non-customer items as at-risk signals
- If an issue is present in multiple systems, mention it once and note the cross-system signal
- All times in Mountain Time
- If any MCP tool is unavailable, say which one and continue with what you have
