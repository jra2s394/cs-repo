---
description: Generate today's daily Slack update
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/daily-update.md` from this repo.

**Day-of-week check (run this FIRST):** check today's day in your local time zone (per `~/.claude/CLAUDE.md`) before pulling any data.

- **If today is Monday:** stop and tell the user: "Today is Monday — `/daily` is for Tue–Fri. The Monday format is `/weekstart` (last week carryover + this week goals). Want me to run `/weekstart` instead, or proceed with `/daily` anyway as a one-off?" Wait for explicit "proceed" before continuing. The smoke test in round-33 confirmed this prompt-line constraint (the prompt's line 11 says so) is real enough to be worth a guard.
- **If today is Saturday or Sunday:** stop and tell the user: "Today is a weekend day — there's no scheduled standup format. Want me to generate `/daily` against Friday → today anyway, or skip?"
- **If today is Tuesday, Wednesday, Thursday, or Friday:** proceed below.

Then generate today's daily Slack standup update for me.

- Use today's date in your local time zone (per `~/.claude/CLAUDE.md`) as the reference point
- Pull fresh data from Gmail, Google Calendar, Asana, and Intercom (per the prompt instructions)
- Apply the accuracy rules from CLAUDE.md strictly — no hallucinated wins
- Save the final output to `data/outputs/daily-<today's date>.md`
- Also copy the saved file to `~/Desktop/CS Reports/Standups/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it). Silently skip the copy if the folder is missing.
- After saving, show me the update inline so I can copy it to Slack

If any MCP tool is unavailable, tell me which one and proceed with what you have.
