---
description: Renewal health pipeline — surface upcoming renewals, risk levels, and recommended actions for each account in the next 90–180 days.
---

Read `CLAUDE.md` from this repo before starting.

Generate a renewal health pipeline for all accounts with renewals in the next 90–180 days. **Always draft for review before building the report.** Nothing is created, posted, or sent without explicit approval.

---

## Step 1 — Get the time window

Ask: "Which window do you want? 90 days / 180 days / custom?" — defaults to 90 days if not specified.

---

## Step 2 — Pull renewal data in parallel

**Gmail:**
- Search for renewal-related email threads (`subject:renewal`, `subject:contract`, `subject:invoice`)
- Note any renewal dates mentioned, ARR references, or contract length signals

**Asana:**
- Pull tasks tagged with "renewal" or in any project named after a customer with a renewal task
- Note due dates, owners, and completion status

**Intercom:**
- Health signals per customer: open conversations, last contact date, escalation flags

**Google Calendar:**
- Any scheduled "renewal call" or "contract review" meetings in the window

If the Finance renewals sheet has been provided (via `/renewals-*` commands recently), cross-reference those dates.

---

## Step 3 — Derive risk scores

Assign each renewal a risk level:

| Signal | 🟢 Low | 🟡 Medium | 🔴 High |
|---|---|---|---|
| Days out | 90+ | 30–90 | < 30 |
| Last contact | < 14 days | 14–30 days | 30+ days |
| Open issues | 0 | 1 | 2+ |
| Renewal task exists | Yes | Partial | No |
| Prior renewal history | Smooth | N/A | Difficult |

If risk data is incomplete for an account, default to 🟡 and flag with "data gap."

---

## Step 4 — Draft the pipeline view

Show the full renewal picture inline before building the report:

```
Renewal Health Pipeline — [Date] — Next [N] Days

Summary: X low-risk · Y medium · Z high-risk

Customer        Renewal Date    Days Out    ARR         Risk       Status        Notes
[Customer]      Jun 15, 2026    22          $18,000     🔴 High    Outreach due  No task in Asana
[Customer]      Jul 1, 2026     38          $12,000     🟡 Medium  In progress   Renewal call Jul 1
[Customer]      Aug 10, 2026    78          $6,000      🟢 Low     On track      Auto-renews
```

For each 🔴 item, state: "Recommended action: [specific next step]"

Ask: "Does this look accurate? Any accounts to add, adjust, or mark different risk levels?"

---

## Step 5 — Build the report (after approval)

Once approved:

**a) Write the metrics JSON** to `data/outputs/renewal-health-metrics-[YYYY-MM-DD].json`:

```json
{
  "generated":  "[e.g. May 26, 2026]",
  "period":     "[e.g. Next 90 Days — through Aug 24, 2026]",
  "dateRange":  "[e.g. May 26 – Aug 24, 2026]",
  "preparedBy": "[Your Name from CLAUDE.md]",
  "kpis": [
    { "value": "[X]",     "label": "Renewals in Window",  "delta": null },
    { "value": "[Y]",     "label": "High Risk",            "delta": "[e.g. 🔴 2 Critical]" },
    { "value": "[$X]",    "label": "ARR at Stake",         "delta": null },
    { "value": "[Z%]",    "label": "On-Track Rate",        "delta": null }
  ],
  "summary": [
    ["🔴 High Risk",   "[count]", "[$ARR]", "Immediate outreach needed"],
    ["🟡 Medium Risk", "[count]", "[$ARR]", "Monitor and schedule calls"],
    ["🟢 Low Risk",    "[count]", "[$ARR]", "On track"]
  ],
  "renewals": [
    {
      "customer":    "[name]",
      "renewalDate": "[e.g. Jun 15, 2026]",
      "daysOut":     22,
      "arr":         "$18,000",
      "risk":        "High",
      "status":      "Outreach due",
      "notes":       "No renewal task in Asana"
    }
  ],
  "playbook": [
    { "customer": "[name]", "owner": "[CSM]", "action": "[next step]", "dueDate": "[date]" }
  ],
  "recs": [
    { "label": "[title]", "body": "[recommendation]" }
  ],
  "methodology": {
    "sources": ["Gmail", "Asana", "Intercom", "Google Calendar"]
  }
}
```

**b) Build the .docx:**
```bash
node reports/renewal-health.js data/outputs/renewal-health-metrics-[YYYY-MM-DD].json
```
Output: `out/Renewal_Health_[Date].docx`
Auto-copies to `~/Desktop/CS Reports/Renewals/` if that folder exists.

---

## Google Drive upload (optional)

After generating the report, ask: "Want me to upload the renewal data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/`
2. Call `mcp__claude_ai_Google_Drive__create_file` with `contentMimeType: "text/csv"`
3. Return the Sheet link.

---

## Rules

- Never invent renewal dates or ARR figures — flag as "confirm with Finance" if unknown
- All 🔴 renewals must have a named recommended action
- Never create Asana tasks, send emails, or add Shortcut stories without explicit approval
- All times in Mountain Time
- If Finance data is missing, note it and proceed with what's available from Gmail/Asana
