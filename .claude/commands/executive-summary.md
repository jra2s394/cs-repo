---
description: Generate an executive summary report — portfolio-wide view combining onboarding, support, renewals, and health for leadership.
---

Read `CLAUDE.md` from this repo before starting.

Generate a portfolio-wide executive summary for leadership or internal review. **Always draft the metrics for review before building the report.** Nothing is sent without explicit approval.

> **MCP gotchas across commands:** Asana team-filter noise (sibling-team projects polluting results), Intercom result-too-large errors (`per_page` token budget; `contact_ids` caps at 15), and stale 2023 overdue tasks all have documented fixes in `/health-score`'s Step 1. Read that section first if any MCP query here misbehaves.

---

## Step 1 — Ask for the period

Ask: "Which period? (e.g., May 2026 / Q2 2026 / Week of May 26)"

---

## Step 2 — Pull all data in parallel

**Intercom:**
- Total conversations this period
- Resolved vs open
- Average first response time
- Escalations

**Gmail:**
- Key threads and milestones
- Any unanswered customer threads older than 5 days

**Asana:**
- Tasks completed this period (across all CS projects)
- Overdue tasks
- Milestones hit

**Google Calendar:**
- Total customer-facing meetings this period
- Upcoming meetings in next 14 days

**Shortcut:**
- Stories created, resolved, and open (CSEng team)
- Any critical blockers

If a Finance mastersheet was recently used (onboarding or renewal reports), reference those figures.

---

## Step 3 — Draft the metrics block inline

Show the executive picture before building the report:

```
Executive Summary — [Period]
Prepared by: [Your Name]

KPIs:
  Active accounts:     [X]
  Accounts going live: [X this period]
  At-risk accounts:    [X]
  Support volume:      [X conversations / [Y resolved / Z open]
  Response time:       [avg first response]
  Open Asana tasks:    [X] ([Y overdue])
  Renewals this period: [X] [$Y ARR]

Highlights:
  ✅ [Win 1 — sourced]
  ✅ [Win 2 — sourced]
  🟡 [Watch item]
  🔴 [Open issue — owner + ETA]

Upcoming:
  [Date] — [Customer] — [Event]
```

Ask: "Does this look accurate? Any data to add or adjust before I build the report?"

---

## Step 4 — Build the report (after approval)

Once approved:

**a) Write the metrics JSON** to `data/outputs/executive-summary-metrics-[YYYY-MM-DD].json`:

```json
{
  "generated":  "[e.g. May 26, 2026]",
  "period":     "[e.g. May 2026]",
  "dateRange":  "[e.g. May 1–26, 2026]",
  "preparedBy": "[Your Name from CLAUDE.md]",
  "priorPeriod": "[e.g. April 2026]",
  "kpis": [
    { "value": "[X]",  "label": "Active Accounts",   "delta": null },
    { "value": "[Y]",  "label": "Support Volume",     "delta": "[e.g. +3 vs prior period]" },
    { "value": "[Z]",  "label": "Onboardings Live",   "delta": null },
    { "value": "[W%]", "label": "Resolution Rate",    "delta": "[e.g. +5%]" }
  ],
  "portfolioMetrics": [
    ["Active accounts",        "[X]",  "[vs prior]"],
    ["Accounts onboarding",    "[X]",  "[vs prior]"],
    ["At-risk accounts",       "[X]",  "[vs prior]"],
    ["Support conversations",  "[X]",  "[vs prior]"],
    ["Resolution rate",        "[X%]", "[vs prior]"],
    ["Avg first response",     "[Xh]", "[vs prior]"],
    ["Asana tasks overdue",    "[X]",  "[vs prior]"],
    ["Renewals this period",   "[X]",  "[$Y ARR]"]
  ],
  "highlights": [
    { "category": "Onboarding", "text": "[win description]", "critical": true },
    { "category": "Support",    "text": "[win description]", "critical": false }
  ],
  "openIssues": [
    {
      "area":        "[Onboarding/Support/Renewal/Engineering]",
      "customer":    "[name or Portfolio]",
      "description": "[issue]",
      "owner":       "[name]",
      "eta":         "[date or TBD]",
      "critical":    true
    }
  ],
  "onboardingSnapshot": [
    ["Accounts currently onboarding", "[X]"],
    ["Go-lives this period",           "[X]"],
    ["Average onboarding duration",    "[X days]"],
    ["Overdue onboarding tasks",       "[X]"]
  ],
  "intercomSnapshot": [
    ["Total conversations",    "[X]"],
    ["Resolved",               "[X] ([X%])"],
    ["Open",                   "[X]"],
    ["Avg first response",     "[Xh]"],
    ["Escalations",            "[X]"]
  ],
  "upcomingEvents": [
    { "date": "[date]", "customer": "[name]", "event": "[type]", "owner": "[CSM]" }
  ],
  "recs": [
    { "label": "[title]", "body": "[recommendation]" }
  ],
  "methodology": {
    "sources": ["Gmail", "Google Calendar", "Asana", "Intercom", "Shortcut"]
  }
}
```

**b) Build the .docx:**
```bash
node reports/executive-summary.js data/outputs/executive-summary-metrics-[YYYY-MM-DD].json
```
Output: `out/Executive_Summary_[Date].docx`
Auto-copies to `~/Desktop/CS Reports/Executive Summaries/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it).

---

## Google Drive upload (optional)

After generating the report, ask: "Want me to upload the summary data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/`
2. Call `mcp__claude_ai_Google_Drive__create_file` with `contentMimeType: "text/csv"`
3. Return the Sheet link.

---

## Rules

- Every win must be sourced (calendar, email, Asana, Shortcut)
- Never claim ARR or financial figures without Finance data to back them up
- Flag unknown data with "confirm with [system]"
- All times in Mountain Time
- If any MCP tool is unavailable, note it and continue with what you have
