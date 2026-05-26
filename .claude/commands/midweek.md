---
description: Generate Wednesday midweek Slack update
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/midweek-update.md` from this repo.

Then generate the Wednesday midweek Slack standup update for me.

- Cover Monday through today (Wednesday) for wins
- Cover today + Thu + Fri for goals
- Pull fresh data from Gmail, Calendar, Asana, Intercom (per prompt instructions)
- Apply the accuracy rules from CLAUDE.md strictly
- Save to `data/outputs/midweek-<today's date>.md`
- Also copy the saved file to `~/Desktop/CS Reports/Standups/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it). Silently skip the copy if the folder is missing.
- Show me the update inline after saving
