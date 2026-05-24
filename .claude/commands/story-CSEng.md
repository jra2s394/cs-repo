---
description: Create a Shortcut story for CS Engineering — onboarding support, CSM escalations, customer config work. Drafts for review before creating.
---

Read `CLAUDE.md` from this repo before starting.

Create a Shortcut story to support a CSM or track CS Engineering work for a customer. Always drafts for review — never creates without explicit approval.

---

## Step 1 — Gather the details

Ask me for the following (collect all in one prompt):

1. **Customer name** — which account is this for?
2. **Story type** — choose one:
   - 🐛 Bug — something broken in the product
   - ⚙️ Config task — customer-specific setup (quotes, workflows, email, integrations)
   - 🚧 Onboarding blocker — blocking go-live or a training milestone
   - 💬 CSM support request — CSM needs eng help to answer a question or resolve an issue
   - 🔧 Feature / custom work — non-standard request that needs product/eng awareness
3. **What's the issue or task?** — describe in plain language
4. **Which CSM is affected?** — who needs to know when this is resolved?
5. **Priority** — is this blocking a go-live, a training session, or just in the queue?

---

## Step 2 — Search Shortcut for an existing story

Before drafting anything, search Shortcut for a story that already covers this:

- Search by customer name
- Search by symptom or feature area keywords
- Search by story type label if applicable

If a match exists, report it:
- Story ID, title, current state, owner
- Ask if I want to add a comment to the existing story instead of creating a new one

---

## Step 3 — Draft the story

Draft the story in the conversation for my review. Use this format:

```
Title: [Customer] — [Short task or symptom description] ([Story type])

Description:
**Customer:** [Name]
**CSM:** [Name]
**Story type:** [Bug / Config task / Onboarding blocker / CSM support request / Feature]
**Priority:** [Blocking go-live / Blocking training / Normal queue]

**What's needed:**
[Clear description of the issue or task — what the engineer needs to do or investigate]

**Context:**
[Why this matters right now — go-live date, training session date, customer-facing impact]

**Definition of done:**
[What does "resolved" look like? What does the CSM need to communicate back to the customer?]

**Related:**
[Intercom link, email thread, Asana task, or prior Shortcut story if applicable]
```

Present the draft. Ask: "Does this look right? Should I create the story in Shortcut?"

---

## Step 4 — Create only after approval

Wait for explicit approval ("looks good", "create it", "yes") before creating the story in Shortcut.

After creating:
- Share the Shortcut story ID and URL
- Ask if the CSM should be notified — if yes, draft a one-line Slack message to them with the story link for my review before sending

If any MCP tool is unavailable, tell me which one and stop.
