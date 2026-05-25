---
description: Identify expansion opportunities — customers showing growth signals, upsell readiness, or referral potential based on live data.
---

Read `CLAUDE.md` and `prompts/expansion-template.md` from this repo before starting — the prompt template has the per-system signal queries and scoring rubric this command relies on.

Surface expansion opportunities across the customer base. **Read-only triage — no outreach is created or sent without explicit approval.**

> **MCP gotchas across commands:** Asana team-filter noise (sibling-team projects polluting results), Intercom result-too-large errors (`per_page` token budget; `contact_ids` caps at 15), and stale 2023 overdue tasks all have documented fixes in `/health-score`'s Step 1. Read that section first if any MCP query here misbehaves.

---

## Step 1 — Ask for scope

Ask: "Do you want to run this for the full portfolio, or a specific customer?"

If a specific customer is named, scope all searches to that customer domain.

---

## Step 2 — Pull growth and usage signals in parallel

**Intercom:**
- Conversations asking about additional features, plants, or integrations
- Keywords: "another plant", "new location", "add a user", "more trucks", "integration", "API", "export"
- Feature request conversations — any opened in the last 90 days
- Customer contacts (user count growth signals)

**Gmail:**
- Email threads mentioning expansion topics: new plants, new locations, fleet growth, new departments
- Any replies indicating satisfaction: "loving it", "working great", "want to expand", "ready for next phase"
- Forwarded emails to new contacts (introduction to other teams or locations)

**Google Calendar:**
- Recent calls where expansion was a topic (Read.ai reports — search `from:e.read.ai` for keywords)
- Upcoming calls where expansion context would be useful

**Asana:**
- Projects with "Phase 2", "expansion", "new location", or "additional plant" in the name
- Completed onboarding projects (recently gone live — prime expansion window)

**Shortcut:**
- Stories requesting custom features, integrations, or new workflows for a specific customer

---

## Step 3 — Score expansion readiness

For each account surfacing signals, score readiness:

| Signal | Points |
|---|---|
| Health score 🟢 | +3 |
| Recently went live (0–90 days) | +2 |
| Feature request conversation | +2 |
| Email mentioning new location/plant | +3 |
| Referral language in email | +2 |
| Expansion ask in a meeting | +3 |
| Multi-plant company | +1 |

Score 8+ = **Ready** · 4–7 = **Watch** · < 4 = **Not yet**

---

## Step 4 — Present findings

```
Expansion Opportunities — [Date]

🟢 READY — High-signal accounts

[Customer]  |  Score: [X]
Signals: [bullet list of specific signals with sources]
Recommended angle: [upsell angle — e.g., "Second plant ready for onboarding"]
Suggested outreach timing: [e.g., "Next scheduled call on May 28"]

---

🟡 WATCH — Emerging signals

[Customer]  |  Score: [X]
Signals: [what was found]
What to monitor: [specific thing to watch for]

---

📣 REFERRAL POTENTIAL

[Customer]  |  Basis: [why — email language, relationship health, meeting note]
```

---

## Step 5 — Offer to draft outreach (after review)

For each 🟢 Ready account, offer:

> "Want me to draft an outreach message or talking points for [Customer]? I can draft a Slack message to the AE, a follow-up email to the customer, or notes for your next call — just say which."

**Draft every piece of outreach before sending or creating anything. Always wait for explicit approval.**

---

## Rules

- Never send emails, post Slack messages, or create Asana tasks without explicit approval
- Every signal must be sourced (email snippet, Intercom thread, meeting note)
- Do not invent expansion signals — if data is sparse, say "limited signals found"
- Never claim ARR amounts unless Finance data confirms them
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
