---
description: Pull a full customer snapshot — open conversations, recent activity, Asana tasks, emails, and go-live status
---

Read `CLAUDE.md` from this repo before starting.

Give me a one-screen summary of a customer before a call or when I need to get up to speed fast.

---

## Step 1 — Get the customer name

Ask me: "Which customer?" if I haven't already said.

---

## Step 2 — Pull data from all sources in parallel

Search simultaneously across:

**Intercom:**
- Open conversations assigned to me for this customer
- Any conversations from the last 30 days (open or closed)
- Note: search by company name or contact email

**Gmail:**
- Recent threads with this customer (last 30 days)
- Any threads with "go-live", "launch", "live", "onboarding" in the subject
- Search `from:e.read.ai` for any Read.ai meeting reports mentioning this customer in the last 30 days — if found, use them as the authoritative meeting summary (they override calendar inference)

**Google Calendar:**
- Upcoming meetings with this customer
- Any past meetings in the last 30 days

**Asana:**
- Open tasks related to this customer

**Shortcut:**
- Search for open stories where the customer name appears in the title or description
- Note the state, owner, and story ID for each

---

## Step 3 — Build the snapshot

Present the summary in this format:

```
## [Customer Name] — Snapshot ([Today's Date])

### Status
[One sentence: where are they in the lifecycle — onboarding, live, active support, etc.]

### Open Intercom conversations
- [Summary of each open conversation — topic and how long it's been open]

### Recent activity (last 30 days)
- [Key emails, meetings, or support threads — dates and brief summaries]

### Upcoming
- [Next scheduled meeting or call, if any]

### Open Asana tasks
- [Task name, due date]

### Open Shortcut stories
- [SC-id — Title — State — Owner]

### Watch items 🔴
- [Anything that looks like a blocker, unresolved issue, or overdue item]
```

---

## Rules

- Flag anything with 🔴 if it's unresolved, overdue, or unclear
- Never claim a meeting happened without a calendar event confirming it
- Never claim a go-live happened without email confirmation
- If data is missing from any source, say so — don't fill in gaps with assumptions
- All times in Mountain Time

If any MCP tool is unavailable, tell me which one and proceed with what you have.
