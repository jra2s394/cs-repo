---
description: Escalate an Intercom conversation to a Shortcut ticket — drafts the ticket for review before creating
disable-model-invocation: true
---

Read `CLAUDE.md` from this repo before starting.

Escalate an Intercom support issue to a Shortcut ticket for the product/engineering team.

---

## Step 1 — Get the conversation

Ask me: "Which Intercom conversation are you escalating? Paste the conversation ID or URL."

Use `get_conversation` to pull the full thread. Read all parts.

---

## Step 2 — Summarize the issue

From the conversation, extract:

- **Customer name and company**
- **What they reported** — exact symptoms in their words, not paraphrased
- **Steps to reproduce** (if known)
- **Impact** — how many users affected, how often, is it a blocker
- **Any screenshots or attachments** — note them, don't embed
- **Conversation link** — the direct Intercom URL

---

## Step 3 — Search Shortcut for existing tickets

Before creating anything, search Shortcut for an existing ticket on the same issue:

- Search by symptom keywords
- Search by customer name
- Search by feature area

If a ticket already exists, report it to me:
- Ticket ID, title, status, owner, any workarounds
- Ask if I want to add a comment linking this conversation instead of creating a new ticket

---

## Step 4 — Draft the Shortcut ticket

Draft the ticket in the conversation for my review. Use this format:

```
Title: [Feature area] — [Short symptom description] (Customer: [Name])

Description:
**Customer:** [Name] — [Company]
**Intercom:** [link]
**Reported:** [date]

**What's happening:**
[Exact symptoms from the conversation — customer's own words where possible]

**Steps to reproduce:**
1. [step]
2. [step]

**Impact:**
[Who is affected, how often, blocker or workaround available]

**Workaround:**
[If any]
```

Present the draft and ask: "Does this look right? Should I create the ticket in Shortcut?"

---

## Step 5 — Create only after approval

Wait for explicit approval before creating the ticket in Shortcut.

After creating, share the Shortcut ticket ID and URL with me.

If any MCP tool is unavailable, tell me which one and stop.
