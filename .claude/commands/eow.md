---
description: Generate Friday end-of-week Slack update
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/eow-update.md` from this repo.

Then generate the Friday end-of-week Slack standup update for me.

- Cover the full work week (Mon-Fri) for wins
- Include "Goals for next week" using next week's calendar
- Pull fresh data from Gmail, Calendar, Asana, Intercom (per prompt instructions)
- **CRITICAL:** Re-verify every claimed win against actual data before finalizing.
  No hallucinated go-lives, no invented integrations, no claimed milestones
  without inbox/calendar evidence.
- Apply ALL accuracy rules from CLAUDE.md
- Save to `data/outputs/eow-<today's date>.md`
- Show me the update inline after saving
