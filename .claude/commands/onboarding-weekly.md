---
description: Generate this week's Onboarding CARR report — WoW comparison + active accounts + at-risk flags
---

Read `CLAUDE.md` and `prompts/onboarding-report-template.md` from this repo before starting.

Generate the **WEEKLY** Onboarding report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user:
1. "What's the path to the onboarding mastersheet?" (e.g., `~/Downloads/onboarding_tracker.xlsx`)
2. "Do you want me to pull Asana task data too?" (default: yes)

---

## Periods

| Period | Definition |
|---|---|
| **This week** | Monday → today (inclusive) |
| **Last week** | Monday → Sunday (full 7 days prior) |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MT = ZoneInfo("America/Denver")
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

this_week_start = today - timedelta(days=today.weekday())  # Monday
last_week_start = this_week_start - timedelta(days=7)
last_week_end   = this_week_start

week_label      = today.strftime("Week of %B %-d, %Y")
week_start_iso  = this_week_start.strftime("%Y-%m-%d")
date_range      = f"Mon {this_week_start.strftime('%-m/%-d')} → {today.strftime('%a %-m/%-d, %Y')}"

print("THIS_WEEK_START:", this_week_start, "|", week_start_iso)
print("LAST_WEEK_START:", last_week_start)
print("DATE_RANGE:", date_range)
```

### 2 — Read and inspect the mastersheet

Follow Step 1 from `prompts/onboarding-report-template.md`. Print headers and a sample before proceeding.

### 3 — Map columns, separate backlog, and normalize data

Follow Steps 2–2.5–3–4–5 from `prompts/onboarding-report-template.md`. **Step 2.5 (backlog separation) must run before period filtering** — backlog rows are excluded from all pipeline metrics and shown in a separate section.

### 4 — Filter records by period

```python
def started_this_week(r):
    d = r.get("start_date")
    return d is not None and this_week_start.date() <= d <= today.date()

def started_last_week(r):
    d = r.get("start_date")
    return d is not None and last_week_start.date() <= d < last_week_end.date()

def completed_this_week(r):
    d = r.get("go_live_date")
    return r["status_norm"] == "Completed" and d is not None and this_week_start.date() <= d <= today.date()

def completed_last_week(r):
    d = r.get("go_live_date")
    return r["status_norm"] == "Completed" and d is not None and last_week_start.date() <= d < last_week_end.date()
```

If no date columns exist, note this clearly and report on current status snapshot only.

### 5 — Compute weekly metrics

```python
# CARR
carr_completed_tw  = sum(r["carr_float"] for r in records if completed_this_week(r) and r["carr_float"])
carr_completed_lw  = sum(r["carr_float"] for r in records if completed_last_week(r) and r["carr_float"])
carr_in_flight     = sum(r["carr_float"] for r in records if r["status_norm"] == "In-Flight" and r["carr_float"])
carr_at_risk       = sum(r["carr_float"] for r in records if r["status_norm"] in ("At-Risk","Blocked") and r["carr_float"])

# Counts
accts_completed_tw = len([r for r in records if completed_this_week(r)])
accts_completed_lw = len([r for r in records if completed_last_week(r)])
accts_started_tw   = len([r for r in records if started_this_week(r)])
accts_started_lw   = len([r for r in records if started_last_week(r)])
accts_in_flight    = len([r for r in records if r["status_norm"] == "In-Flight"])
accts_at_risk      = len([r for r in records if r["status_norm"] in ("At-Risk","Blocked")])

# Days in onboarding for in-flight accounts
def days_in(r):
    if r.get("start_date"):
        return (today.date() - r["start_date"]).days
    return None
```

### 6 — Pull Asana data

Follow Step 6 from `prompts/onboarding-report-template.md`. Build `asanaTable` rows.

### 7 — Build accountsTable

Include ALL in-flight + completed-this-week accounts. Sort: Blocked first, then At-Risk, then In-Flight (by days in desc), then Completed.

```python
# Example row:
# ["[CUSTOMER_E]", "Slabstack Core", "$18.5k", status_cell("Blocked"), "47 days"]
# status_cell() from template Step 5 — adds color styling
```

### 8 — Build atRisk list

```python
at_risk = []
for r in records:
    if r["status_norm"] in ("Blocked", "At-Risk"):
        at_risk.append({
            "customer": r["customer"],
            "project":  r["project"],
            "carr":     r["carr_fmt"],
            "issue":    r["notes"] or f"Status: {r['status_norm']} — needs review",
            "urgent":   r["status_norm"] == "Blocked",
        })
```

### 9 — Save markdown summary

Save to: `data/outputs/onboarding-weekly-YYYY-MM-DD.md`

Include a plain-text summary: CARR completed, CARR in-flight, accounts, at-risk count, top flags.

### 10 — Write metrics JSON

Save to: `data/outputs/onboarding-weekly-metrics-YYYY-MM-DD.json`

```json
{
  "period":        "[e.g. Week of May 26, 2026]",
  "dateRange":     "[e.g. Mon 5/26 → Fri 5/30, 2026]",
  "generated":     "[e.g. May 26, 2026]",
  "preparedBy":    "[Your Name]",
  "weekStartDate": "[e.g. 2026-05-26]",
  "sourceFile":    "[filename of uploaded sheet]",
  "kpis": [
    { "value": "[carr_completed_tw fmt]", "label": "CARR Completed",  "delta": "[WoW delta or '— no prior']" },
    { "value": "[carr_in_flight fmt]",    "label": "CARR In-Flight",   "delta": "[accts_in_flight] accounts" },
    { "value": "[accts_completed_tw]",    "label": "Completed",        "delta": "[WoW delta]" },
    { "value": "[accts_at_risk]",         "label": "At-Risk",          "delta": "[if >0: 'needs review']", "deltaColor": "B23A2E" }
  ],
  "priorPeriod": "[e.g. Week of May 19]",
  "summaryTable": [
    ["CARR Completed",    "[tw fmt]", "[lw fmt]", "[delta]"],
    ["CARR In-Flight",    "[fmt]",    "—",        "—"],
    ["CARR At-Risk",      "[fmt]",    "—",        "—"],
    ["Accounts Completed","[tw]",     "[lw]",     "[delta]"],
    ["Accounts Started",  "[tw]",     "[lw]",     "[delta]"],
    ["Accounts In-Flight","[count]",  "—",        "—"],
    ["At-Risk / Blocked", "[count]",  "—",        "—"]
  ],
  "accountsTable": [
    ["[customer]", "[project]", "[carr]", {"text":"[status]","fill":"...","color":"...","bold":true}, "[X days]"],
    "..."
  ],
  "atRisk": [
    { "customer": "[name]", "project": "[project]", "carr": "[fmt]", "issue": "[description]", "urgent": true }
  ],
  "asanaTable": [
    ["[category]", "[complete]", "[open]", "[overdue]"]
  ],
  "recs": [
    { "num": 1, "title": "[title]", "tag": "[ACTION]", "tagColor": "B23A2E", "body": "[body]" }
  ],
  "backlogTable": [
    ["[customer]", "[project]", "[carr fmt]"]
  ],
  "carrBacklog": "[fmt — total backlog CARR, or '—' if none]",
  "methodology": {
    "sourceFile":    "[filename]",
    "rowsProcessed": "[int]",
    "asanaTasks":    "[int or 0]",
    "period":        "[e.g. May 26 – May 30, 2026]"
  }
}
```

### 11 — Generate .docx

```bash
node reports/onboarding-weekly.js data/outputs/onboarding-weekly-metrics-YYYY-MM-DD.json
```

Output: `out/Onboarding_Weekly_YYYY-MM-DD.docx`

Convert to PDF *(skip if LibreOffice not installed)*:
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/Onboarding_Weekly_YYYY-MM-DD.docx
```

---

End with: "Want me to share this in Slack, drop it in Google Drive, or tweak anything?"
