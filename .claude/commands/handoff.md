---
description: Generate a CSM handoff brief when a customer transitions to a new owner — full context dump from all systems.
argument-hint: <customer name>
---

Read `CLAUDE.md` from this repo before starting.

Generate a complete handoff brief for a customer changing CSM ownership. **Always draft for review before saving or sharing.** Nothing is sent or updated without explicit approval.

> **MCP gotchas across commands:** Asana team-filter noise (sibling-team projects polluting results), Intercom result-too-large errors (`per_page` token budget; `contact_ids` caps at 15), and stale 2023 overdue tasks all have documented fixes in `/health-score`'s Step 1. Read that section first if any MCP query here misbehaves.

---

## Step 1 — Identify the handoff

Ask:
1. Which customer?
2. Who is the outgoing CSM?
3. Who is the incoming CSM?
4. What is the handoff date?
5. Reason for handoff (optional — role change, team reorg, account growth, departure)?

---

## Step 2 — Pull full context in parallel

**Intercom:**
- All open conversations — count, topics, days open
- Resolved conversations from the past 90 days — recurring themes, escalations
- Date of last customer contact

**Gmail:**
- Recent email threads (last 90 days) with this customer domain
- Any unanswered threads, outstanding commitments, or open questions
- Forward-looking commitments: "I'll get back to you on X", "We'll have Y by Z"

**Google Calendar:**
- All past meetings this quarter — topics, attendees
- Upcoming meetings — dates, contexts, any that the new CSM needs to take over

**Asana:**
- All open tasks for this customer
- Completed milestones and when — training, go-live, etc.
- Overdue tasks with context

**Shortcut:**
- Open engineering stories with this customer's name
- Recently resolved stories — what was fixed, when

**Read.ai (Gmail `from:e.read.ai`):**
- Meeting reports from the last 90 days — key topics, action items, commitments made

---

## Step 3 — Generate the handoff brief

Draft the full handoff document:

```
# CSM Handoff Brief — [Customer Name]
**Outgoing CSM:** [Name]  |  **Incoming CSM:** [Name]
**Handoff Date:** [Date]  |  **Prepared:** [Date]

---

## Customer Overview
- **Go-live date:** [date]
- **Primary contacts:** [names, roles, emails]
- **Account health:** [🟢/🟡/🔴 + reason]
- **ARR:** [from Finance email or "confirm with Finance"]
- **Contract type:** [from email context or "confirm with Finance"]
- **Renewal date:** [from email or "confirm with Finance"]

---

## Relationship Context
[2–3 sentences: relationship quality, communication style, known sensitivities]

---

## What's Going Well ✅
- [Item: source]
- [Item: source]

---

## Open Issues & Commitments 🔴
- [Issue — age — what's needed — who promised what]
- [Outstanding commitment from email: "We'll have X by Y"]

---

## Active Asana Tasks
| Task | Due Date | Status |
|---|---|---|
| [task] | [date] | [open/overdue] |

---

## Engineering Stories (Shortcut)
| Story | State | Notes |
|---|---|---|
| SC-[id] | [state] | [brief] |

---

## Key Meetings (Last 90 Days)
- [Date] — [topic] — [key outcome or commitment]

---

## Upcoming Meetings
- [Date] — [topic] — [action needed from new CSM]

---

## Introduction Note (Draft)
The following note can be sent to the customer to introduce the new CSM.
[Review and edit before sending]

> Hi [Contact],
>
> I wanted to let you know that [Incoming CSM] will be taking over as your primary point of contact at Slabstack going forward. [He/She/They] is already up to speed on your account and the [open item] we've been working on.
>
> [Incoming CSM] will be in touch shortly to schedule an introduction call. You'll be in great hands.
>
> Thank you for everything — it's been great working with you.
>
> [Outgoing CSM]
```

Ask: "Does this brief look complete? Any context to add or correct before I save it?"

---

## Step 4 — Save and next actions (after approval)

Once approved:

1. Save to `data/outputs/handoff-[customer-slug]-[date].md`
2. Offer to send the introduction email draft via Gmail — wait for explicit approval
3. Offer to create an Asana task for the new CSM: "Review handoff brief and schedule intro call — due [handoff date + 3 days]" — draft first, wait for approval

---

## Rules

- Never send emails without explicit approval
- Never create tasks without explicit approval
- Never update Shortcut story ownership — tell the user what to do in Shortcut
- Flag any outstanding commitments as 🔴 — these must be resolved or transferred explicitly
- All times in Mountain Time
