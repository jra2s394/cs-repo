---
description: Show all Shortcut stories from the CSEng team that are pending engineering review or approval — grouped by urgency and how long they've been waiting.
---

Read `CLAUDE.md` from this repo before starting.

Surface every Shortcut story that needs engineering eyes right now. **Read-only — nothing is created, updated, or moved.** Story state changes happen in Shortcut, not here.

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

## Step 3 — Suggest next actions (do not execute them)

After the list, surface what should happen next for each bucket — tell the user what to do in Shortcut, not do it for them:

- 🔴 stories: "SC-[id] needs eng review — open it in Shortcut and move to In Review when picked up."
- 🟢 stories: "SC-[id] is ready to merge — merge it in Shortcut when ready."

If the user wants to add a comment: draft it in conversation and wait for approval before posting via `stories-create-comment`.

If the user wants to ping someone: draft a one-line Slack message and wait for approval before sending.

**Never call `stories-update` to change workflow state.** The user moves stories in Shortcut.

---

## Rules

- Read-only: never update story state, assign/unassign, or close a story
- Never post a comment or Slack message without explicit approval
- If any MCP tool is unavailable, say which one and show results from what you have
