# Expansion Opportunity — Prompt Template

Use this template when running `/expansion`. Claude uses this to find and score growth signals across the portfolio.

---

## Expansion Signal Searches

### Intercom
- Keywords in conversation body: "another plant", "new location", "add a user", "more trucks", "integration", "API", "export", "second plant"
- Tag filter: "feature request" (any opened in last 90 days)
- Count distinct customer contacts (user seat growth signal)

### Gmail
- `from:[customer-domain] ("plant" OR "location" OR "expand" OR "new site") newer_than:90d`
- `from:[customer-domain] ("love" OR "great" OR "perfect" OR "ready for next") newer_than:90d` — satisfaction signals
- Look for emails with new contacts CC'd from the same company (introduction to other teams/locations)
- `from:e.read.ai` — search Read.ai reports for expansion topics

### Asana
- Project names with "Phase 2", "expansion", "new location", "additional plant"
- Recently completed onboarding projects (went live in last 90 days = prime expansion window)

### Shortcut
- Stories with "integration", "export", "custom", "Phase 2" in title for a specific customer
- Feature requests tagged to a specific customer

## Scoring Rubric

| Signal | Points |
|---|---|
| 🟢 Health score | +3 |
| Went live in last 90 days | +2 |
| Intercom feature request | +2 |
| Email mentioning new location/plant | +3 |
| Referral language in email | +2 |
| Expansion ask in meeting (Read.ai) | +3 |
| Multi-plant company with only one live | +1 |

**Score bands:** 8+ = Ready · 4–7 = Watch · <4 = Not yet

## Output Format Rules

- Source every signal with the exact system and date
- Never claim expansion intent without a signal to cite
- Score each account and show which signals contributed
- "Multi-plant" signal: only assign if the company clearly has multiple plants (from email/meeting context)
- Referral language: only assign if the email clearly references another company or contact

## Outreach Drafting Rules

When drafting outreach after user approval:
- Personalize to the specific signal ("I saw your note about adding a second plant…")
- Keep draft emails under 150 words
- AE notification Slack: mention story or email signal, keep it one sentence
- Never pitch expansion in the first contact after an issue was raised — timing matters
