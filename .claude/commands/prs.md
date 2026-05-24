---
description: Show all Shortcut stories from the CSEng team that are pending engineering review or approval — grouped by urgency and how long they've been waiting.
---

Read `CLAUDE.md` from this repo before starting.

Surface every Shortcut story that needs engineering eyes right now. Read-only — nothing is created or changed.

---

## Step 1 — Pull stories pending review

Run these searches in parallel:

1. **CSEng workflow — Ready for Eng Review**
   - `state: "Ready for Eng Review"`, `team: "cseng"`

2. **Engineering workflow — review states, CSEng team**
   - `state: "Ready for Review"`, `team: "cseng"`
   - `state: "In Review"`, `team: "cseng"`
   - `state: "Ready to Merge"`, `team: "cseng"`

3. **CS & Onboarding — urgent review flag**
   - `state: "001 - Product Review ASAP"`

Deduplicate by story ID if any story appears in multiple searches.

---

## Step 2 — Display

Group results into three buckets:

### 🔴 Needs Action Now
- Stories in "Ready for Eng Review" or "001 - Product Review ASAP"
- Stories in any review state that have been waiting **5+ days**

### 🟡 In Review
- Stories in "In Review" or "Ready for Review" waiting fewer than 5 days

### 🟢 Ready to Merge
- Stories in "Ready to Merge" — approved, just needs the merge

For each story show:

```
SC-[id] — [Title]
State: [state name]  |  Owner: [name]  |  Waiting: [X days since last state change]
[Shortcut URL]
```

Sort within each bucket by longest wait first.

If no stories are found in any state, say: "No stories pending eng review right now."

---

## Step 3 — Offer next actions

After the list, ask:

> "Want to open any of these, add a comment, or ping someone?"

If they want to add a comment: draft it in the conversation and wait for approval before posting.
If they want to ping someone: draft a one-line Slack message and wait for approval before sending.

---

## Rules

- Never post, comment, or update a story without explicit approval
- If any MCP tool is unavailable, say which one and show results from what you have
