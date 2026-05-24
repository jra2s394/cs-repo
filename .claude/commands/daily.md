---
description: Generate today's daily Slack update
---

Read `CLAUDE.md` and `prompts/daily-update.md` from this repo.

Then generate today's daily Slack standup update for me.

- Use today's date in Mountain Time as the reference point
- Pull fresh data from Gmail, Google Calendar, Asana, and Intercom (per the prompt instructions)
- Apply the accuracy rules from CLAUDE.md strictly — no hallucinated wins
- Save the final output to `data/outputs/daily-<today's date>.md`
- After saving, show me the update inline so I can copy it to Slack

If any MCP tool is unavailable, tell me which one and proceed with what you have.
