---
description: Generate Monday week-start Slack update
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/week-start-update.md` from this repo.

Then generate the Monday week-start Slack standup update for me.

- First, read the most recent file in `data/outputs/eow-*.md` for carryover context
- Cover this week's calendar (Mon-Fri) for goals
- Pull fresh data from Gmail (since Friday), Calendar, Asana, Intercom
- Apply the accuracy rules from CLAUDE.md strictly
- Save to `data/outputs/week-start-<today's date>.md`
- Also copy the saved file to `~/Desktop/CS Reports/Standups/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it). Silently skip the copy if the folder is missing.
- Show me the update inline after saving
