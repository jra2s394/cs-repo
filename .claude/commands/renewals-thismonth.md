---
description: Generate this month's renewal invoice report — what Finance needs to bill now
---

Read `CLAUDE.md` and `prompts/renewals-report-template.md` from this repo before starting.

Generate the **THIS MONTH** Renewals report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user: "What's the path to the renewals sheet from Finance?" (e.g., `~/Downloads/May 2026 Renewals - Slabstack.xlsx`)

---

## Period

| Period | Definition |
|---|---|
| **This month** | Contracts with end_date in (today.month − 1) → renewal invoice due this month |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, date
from zoneinfo import ZoneInfo

MT = ZoneInfo("America/Denver")
today = datetime.now(MT).date()

target_year  = today.year
target_month = today.month
target_label = today.strftime("%B %Y")

# End dates to look for: last month
prior_month = target_month - 1 if target_month > 1 else 12
prior_year  = target_year if target_month > 1 else target_year - 1
```

### 2–7 — Read sheet, map columns, parse, filter, build rows, build flags

Follow Steps 1–8 from `prompts/renewals-report-template.md`.

Filter: `period_records = [r for r in records if renews_in_month(r, target_year, target_month)]`

If no records match the target month, also include records where end_date.month == target_month (contracts expiring mid-month this month).

### 8 — Compute totals

Follow Step 9 from `prompts/renewals-report-template.md`.

### 9 — Save markdown summary

Save to: `data/outputs/renewals-thismonth-YYYY-MM-DD.md`

### 10 — Write metrics JSON

Save to: `data/outputs/renewals-thismonth-metrics-YYYY-MM-DD.json`

Use the schema from `prompts/renewals-report-template.md`. Set:
- `"period"`: e.g. `"May 2026"`
- `"periodType"`: `"thismonth"`
- `"monthlyGroups"`: `null`

### 11 — Generate .docx

```bash
node reports/renewals-thismonth.js data/outputs/renewals-thismonth-metrics-YYYY-MM-DD.json
```

Output: `out/Renewals_ThisMonth_YYYY-MM.docx`

---

End with: "Want me to share this in Slack, drop it in Google Drive, or tweak anything?"
