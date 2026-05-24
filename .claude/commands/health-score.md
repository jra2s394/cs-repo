---
description: Portfolio health scorecard — pull live data across all active accounts and surface who's green, yellow, and red in a single view.
---

Read `CLAUDE.md` from this repo before starting.

Generate a portfolio health scorecard. **Always draft the metrics for review before building the report.** Nothing is created, posted, or sent without explicit approval.

---

## Step 1 — Pull live data in parallel

Fetch data simultaneously for all active accounts:

**Asana:**
- All tasks across active onboarding and CS accounts
- For each account: total tasks, complete, open, overdue count

**Intercom:**
- Open conversations by customer domain
- Unresolved count, most recent contact date, escalation flags

**Shortcut:**
- Open stories with customer names — count by customer
- Any stories in "Blocked" or "Escalated" state

**Gmail:**
- Last email sent/received per customer domain
- Any unanswered threads older than 7 days

**Google Calendar:**
- Upcoming customer calls in next 30 days
- Most recent past meeting per customer

---

## Step 2 — Derive health scores

For each account, compute a health score using this rubric:

| Dimension | 🟢 Green | 🟡 Yellow | 🔴 Red |
|---|---|---|---|
| Last contact | < 14 days | 14–30 days | 30+ days |
| Overdue tasks | 0 | 1–2 | 3+ |
| Open Intercom convos | 0 | 1–2 | 3+ |
| Open Shortcut blockers | 0 | 1 | 2+ |

Assign each account a final health score: 🟢 Green / 🟡 Yellow / 🔴 Red.
Flag any accounts with missing data as 🔴 (data gap is itself a health signal).

---

## Step 3 — Draft the metrics block

Show the full health picture inline before building the report:

```
Portfolio Health — [Date]

Summary: X green · Y yellow · Z red

Account         CSM         Health  Last Contact    Open Issues  Tasks Overdue
[Customer]      [Name]      🟢      May 20, 2026    0            0
[Customer]      [Name]      🟡      May 8, 2026     2            1
[Customer]      [Name]      🔴      Apr 22, 2026    3            4
```

Include any at-risk callouts:
```
🔴 [Customer] — [issue description] | Owner: [CSM] | Recommended action: [...]
```

Ask: "Does this look accurate? Any accounts to add, remove, or adjust before I build the report?"

---

## Step 4 — Build the report (after approval)

Once approved:

**a) Write the metrics JSON** to `data/outputs/customer-health-metrics-[YYYY-MM-DD].json`:

```json
{
  "generated":  "[e.g. May 26, 2026]",
  "period":     "[e.g. May 2026]",
  "dateRange":  "[e.g. May 1–26, 2026]",
  "preparedBy": "[Your Name from CLAUDE.md]",
  "kpis": [
    { "value": "[X]",    "label": "Active Accounts",  "delta": null },
    { "value": "[Y]",    "label": "At Risk",           "delta": "[e.g. 🔴 2 Critical]" },
    { "value": "[Z%]",   "label": "On-Track Rate",     "delta": "[e.g. +5% vs last month]" },
    { "value": "[🟢/🟡/🔴]", "label": "Portfolio Health", "delta": null }
  ],
  "summary": [
    ["🟢 Green",  "[count]", "[X%]"],
    ["🟡 Yellow", "[count]", "[X%]"],
    ["🔴 Red",    "[count]", "[X%]"]
  ],
  "accounts": [
    {
      "customer":    "[name]",
      "csm":         "[name]",
      "healthScore": "🟢 Green",
      "lastContact": "May 20, 2026",
      "openIssues":  0,
      "tasksOverdue": 0
    }
  ],
  "atRisk": [
    {
      "customer": "[name]",
      "issue":    "[description]",
      "owner":    "[CSM name]",
      "action":   "[recommended next step]",
      "critical": true
    }
  ],
  "upcomingRenewals": [
    { "customer": "[name]", "renewalDate": "[date]", "daysOut": 60, "arr": "$12,000", "risk": "Medium" }
  ],
  "recs": [
    { "label": "[title]", "body": "[recommendation text]" }
  ],
  "methodology": {
    "sources": ["Asana", "Intercom", "Gmail", "Google Calendar", "Shortcut"]
  }
}
```

**b) Build the .docx:**
```bash
node reports/customer-health.js data/outputs/customer-health-metrics-[YYYY-MM-DD].json
```
Output: `out/Customer_Health_[Date].docx`
Auto-copies to `~/Desktop/CS Reports/Health Reports/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it).

---

## Google Drive upload (optional)

After generating the report, ask: "Want me to upload the health data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "Portfolio Health — [Period]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

## Rules

- Health scores must come from live tool data — never estimated
- Every 🔴 account gets a named recommended action
- Flag missing data accounts as 🔴 (data gap is a risk)
- All times in Mountain Time
- If any MCP tool is unavailable, note it and continue with what you have
