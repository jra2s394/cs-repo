---
description: Go-live readiness check for a customer — surfaces open blockers across Asana, Shortcut, Intercom, and email before a launch date.
argument-hint: <customer name>
---

Read `CLAUDE.md` from this repo before starting.

Run a go-live readiness check for a customer. Read-only — surfaces blockers for review, nothing is created or changed without approval.

---

## Step 1 — Get the customer and go-live date

Ask:
1. **Which customer?**
2. **What's the go-live date?** (or "today" if it's launch day)

---

## Step 2 — Pull readiness data in parallel

Search simultaneously across:

**Asana:**
- All open tasks for this customer — flag any overdue or due before the go-live date
- Look for tasks tagged with "go-live", "launch", "training", "setup", "configuration"
- Count: total open, overdue, due before go-live, no due date

**Shortcut:**
- Open stories mentioning this customer
- Specifically flag: bugs, onboarding blockers (`state: "Ready for Eng Review"`, `state: "In Progress"`)
- Any story in "Blocked" or "Waiting on Customer" state

**Intercom:**
- Open conversations for this customer
- Any conversation older than 48h without a response from the team
- Any conversation with "error", "issue", "not working", "broken" in recent messages

**Gmail:**
- Any unanswered email from this customer in the last 7 days
- Any email thread with open questions or pending action items
- Search `from:e.read.ai` for training session reports — confirm training was completed

**Google Calendar:**
- Upcoming events with this customer in the next 7 days
- Confirm a go-live call or handoff is scheduled

---

## Step 3 — Report readiness status

Present a go-live readiness scorecard:

```
# Go-Live Readiness — [Customer Name]
## Target date: [date] | Checked: [today]

### Overall status: [🟢 Ready / 🟡 Watch items / 🔴 Not ready]

---

### Asana tasks
🔴 Overdue: [count] — [list names]
🟡 Due before go-live: [count] — [list names]
🟢 Completed this week: [count]

### Shortcut stories
🔴 Open blockers: [list SC-id, title, state]
🟡 In progress: [list SC-id, title, state]
🟢 Resolved this week: [count]

### Intercom
🔴 Open conversations: [count] — [oldest: X days]
🟡 Unanswered > 48h: [count]
🟢 Resolved this week: [count]

### Email
🔴 Unanswered threads: [subject, age]
🟡 Threads with open questions: [subject]

### Training
[🟢 Confirmed complete (Read.ai: [date]) / 🔴 No confirmation found / 🟡 Scheduled: [date]]

### Go-live call
[🟢 Scheduled: [date/time] / 🔴 Not found on calendar]

---

### Blockers to resolve before go-live
1. [Most critical — what needs to happen and who owns it]
2. [Second blocker]
...

### Recommended next steps
- [ ] [Action with owner]
- [ ] [Action with owner]
```

---

## Step 4 — Offer to create tasks

After the readiness report, ask: "Want me to create Asana tasks for any of these action items?"

Draft any tasks before creating them. Wait for explicit approval.

---

## Rules

- Never claim training completed without a Read.ai report or email confirmation
- Never claim a go-live call is scheduled without a calendar event
- Flag all unclear status as 🔴 — don't guess
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
- If any MCP tool is unavailable, note it and continue with what you have
