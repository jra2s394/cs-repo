---
description: Complete a customer onboarding — checklist, closure tasks in Asana, handoff brief, and go-live confirmation message.
---

Read `CLAUDE.md` from this repo before starting.

Walk through the end-of-onboarding checklist for a customer, generate a closure brief, and draft any post-go-live items. **Nothing is created, sent, or updated without explicit approval at each step.**

---

## Step 1 — Identify the customer

Ask: "Which customer is completing onboarding? And who is the CSM of record?"

---

## Step 2 — Pull the full current state in parallel

**Asana:**
- All tasks in the onboarding project — complete, incomplete, and overdue
- Milestone tasks: training complete, go-live confirmed, sign-off received
- Any open blockers

**Intercom:**
- Open conversations with this customer — are any unresolved?
- Date of most recent conversation

**Shortcut:**
- Open engineering stories tagged to this customer
- Any stories in "Blocked" or "In Progress" that aren't closed

**Gmail:**
- Any unanswered email threads from this customer domain
- Search for go-live confirmation or training completion confirmation

**Google Calendar:**
- Has a go-live call happened? Is there a post-go-live check-in scheduled?

---

## Step 3 — Generate the closure checklist

Display the checklist inline:

```
Onboarding Closure Checklist — [Customer Name]
Prepared: [Date] | CSM: [Name]

REQUIRED BEFORE CLOSURE
[ ] All Asana onboarding tasks complete (X open — list them)
[ ] Go-live confirmed (calendar event found: [date] / NOT FOUND 🔴)
[ ] Training complete (confirmed via email/calendar / NOT CONFIRMED 🔴)
[ ] No open Intercom conversations (X open — list them)
[ ] No open Shortcut engineering blockers (X open — list them)
[ ] Customer sign-off received (email found / NOT FOUND 🔴)

POST-CLOSURE TASKS (to create in Asana after approval)
[ ] Schedule 30-day check-in call
[ ] Update customer master with go-live date
[ ] Archive onboarding project in Asana
[ ] Add customer to QBR calendar
```

Flag anything missing as 🔴.

Ask: "Before we close out, these items need resolution: [list any 🔴 items]. Want to proceed anyway or address these first?"

---

## Step 4 — Draft the go-live confirmation email (after approval)

Draft a brief go-live email to send to the customer:

```
Subject: You're live on Slabstack! 🎉

Hi [Contact],

Congratulations — you're officially live on Slabstack!

Here's what to expect going forward:
• [Brief 2-3 bullet points: support channels, KB link, primary CSM contact]

If anything comes up, you can always reach us at [support channel / email].

Thank you for working with us through the setup process — excited to see [Customer Name] get the most out of Slabstack.

[CSM Name]
```

Wait for explicit approval before sending via Gmail. If approved, send using Gmail MCP.

---

## Step 5 — Create post-closure Asana tasks (after approval)

Draft the following tasks before creating any of them:

1. **30-day check-in call** — due: [go-live date + 30 days] | owner: CSM
2. **Update customer master with go-live date** — due: today | owner: CSM
3. **Schedule QBR — 90 days** — due: [go-live + 60 days] | owner: CSM

Show all three drafts. Wait for explicit "create them" before calling `create_tasks`.

---

## Step 6 — Post-closure summary

Generate a brief internal summary:

```
Onboarding Closed — [Customer Name]
Go-live date: [date]
Training completed: [date]
CSM: [name]
Onboarding duration: [X days]
Open items at closure: [X — list if any]
Next milestone: 30-day check-in on [date]
```

Ask: "Want me to save this to `data/outputs/end-onboarding-[customer-slug]-[date].md`?"

---

## Rules

- Never mark Asana tasks complete via API — tell the user what to complete and give the link
- Never send the go-live email without explicit approval
- Never create Asana tasks without explicit approval
- If any required closure items are missing (no go-live confirmation, open blockers), flag 🔴 and wait for direction
- All times in Mountain Time
