---
description: Weekly CS team summary — roll up what the full team accomplished this week for the manager standup or team Slack channel.
disable-model-invocation: true
---

Read `CLAUDE.md` from this repo before starting.

Generate a weekly CS team summary. Pulls activity across all connected systems, organizes by team member, and drafts a Slack summary for review. **Draft before posting — never sends without explicit approval.**

> **MCP gotchas across commands:** Asana team-filter noise (sibling-team projects polluting results), Intercom result-too-large errors (`per_page` token budget; `contact_ids` caps at 15), and stale 2023 overdue tasks all have documented fixes in `/health-score`'s Step 1. Read that section first if any MCP query here misbehaves.

---

## Step 1 — Get the week

Defaults to the current week (Mon–today in your local time zone). Ask if a different week is needed.

---

## Step 2 — Pull team activity in parallel

For each teammate listed in CLAUDE.md:

**Asana:**
- Tasks completed this week by each team member
- Tasks created, assigned, or updated

**Intercom:**
- Conversations each admin handled this week (use admin IDs from CLAUDE.md)
- Resolved count per person
- Any escalations

**Shortcut:**
- Stories moved to "Done" or "Ready to Merge" by team member
- Stories created by team member

**Google Calendar:**
- Customer-facing meetings for each team member this week

**Gmail:**
- Significant threads sent by team members (customer domain emails)

---

## Step 3 — Draft the team summary

```
📊 CS Team Weekly Summary — Week of [Mon Date]

**Team wins this week:**
• [Win 1 — sourced to person + system]
• [Win 2 — sourced to person + system]
• [Win 3 — sourced to person + system]

**By teammate:**

👤 [Name]
  ✅ [Task/story/win — source]
  ✅ [Task/story/win — source]

👤 [Name]
  ✅ [Task/story/win — source]

**Support volume:** [X conversations total — X resolved / X open]
**Onboarding:** [X active / X went live this week]

**Next week focus:**
• [Item 1]
• [Item 2]

**Any 🔴 items:**
• [Blocker or risk — owner]
```

---

## Step 4 — Review and post

Show the draft and ask: "Want me to post this to Slack? If so, which channel?"

If yes:
1. Get channel name or ID
2. Draft the final message for approval
3. Wait for explicit "post it" before calling `slack_send_message`

---

## Rules

- Only report facts traceable to a tool — no inferred wins
- If a teammate has no Intercom admin ID in CLAUDE.md, skip Intercom for them (note the gap)
- Never post to Slack without explicit approval and channel confirmation
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
- If any MCP tool is unavailable, note it and surface what you have
