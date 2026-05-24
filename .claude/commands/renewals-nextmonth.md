---
description: Generate next month's renewal invoice report — pipeline of what Finance needs to bill soon
---

Read `CLAUDE.md` and `prompts/renewals-report-template.md` from this repo before starting.

Generate the **NEXT MONTH** Renewals report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user: "What's the path to the renewals sheet from Finance?" (e.g., `~/Downloads/June 2026 Renewals - Slabstack.xlsx`)

---

## Period

| Period | Definition |
|---|---|
| **Next month** | Contracts with end_date in today.month → renewal invoice due next month |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, date
from zoneinfo import ZoneInfo
from calendar import monthrange

MT = ZoneInfo("America/Denver")
today = datetime.now(MT).date()

# Next month
if today.month == 12:
    target_month = 1
    target_year  = today.year + 1
else:
    target_month = today.month + 1
    target_year  = today.year

target_label = datetime(target_year, target_month, 1).strftime("%B %Y")
_, last_day  = monthrange(target_year, target_month)
date_range   = f"{datetime(target_year, target_month, 1).strftime('%b %-d')} – {datetime(target_year, target_month, last_day).strftime('%b %-d, %Y')}"
```

### 2–7 — Read sheet, map columns, parse, filter, build rows, build flags

Follow Steps 1–8 from `prompts/renewals-report-template.md`.

Filter: `period_records = [r for r in records if renews_in_month(r, target_year, target_month)]`

### 8 — Compute totals

Follow Step 9 from `prompts/renewals-report-template.md`.

### 9 — Save markdown summary

Save to: `data/outputs/renewals-nextmonth-YYYY-MM-DD.md`

### 10 — Write metrics JSON

Save to: `data/outputs/renewals-nextmonth-metrics-YYYY-MM-DD.json`

Use the schema from `prompts/renewals-report-template.md`. Set:
- `"period"`: e.g. `"June 2026"`
- `"periodType"`: `"nextmonth"`
- `"monthlyGroups"`: `null`

### 11 — Generate .docx

```bash
node reports/renewals-nextmonth.js data/outputs/renewals-nextmonth-metrics-YYYY-MM-DD.json
```

Output: `out/Renewals_NextMonth_YYYY-MM.docx`

---

## Google Drive upload (optional)

After showing the report, ask: "Want me to upload the invoice data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "Renewals Next Month — [Period]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

End with: "Want me to upload the invoice data to Google Sheets, share this in Slack, or tweak anything?"
