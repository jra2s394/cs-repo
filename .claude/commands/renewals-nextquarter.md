---
description: Generate next quarter's renewal pipeline — three-month invoice forecast for CS and Finance planning
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/renewals-report-template.md` from this repo before starting.

Generate the **NEXT QUARTER** Renewals report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user:
1. "What's the path to the renewals sheet from Finance? If you have sheets for multiple months in the quarter, provide them space-separated."
2. Note: Finance may only have next month's sheet ready. If so, generate the report for that month and note the remaining months as pending.

---

## Period

| Period | Definition |
|---|---|
| **Next quarter** | Three calendar months of the next quarter — contracts expiring in the prior quarter |

---

## Step-by-step Instructions

### 1 — Calculate quarter bounds

```python
from datetime import datetime, date
from zoneinfo import ZoneInfo
from calendar import monthrange

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")
today = datetime.now(MT).date()

this_q = (today.month - 1) // 3   # 0=Q1, 1=Q2, 2=Q3, 3=Q4
next_q = (this_q + 1) % 4
next_q_year = today.year if this_q < 3 else today.year + 1
next_q_label = f"Q{next_q + 1} {next_q_year}"

# Months in next quarter
q_months = [(next_q_year, next_q*3 + 1 + i) for i in range(3)]
# Handle year wrap for Q4→Q1
q_months = [(y + (0 if m <= 12 else 1), m if m <= 12 else m - 12) for y, m in q_months]
```

### 2–7 — Read sheet(s), map columns, parse, filter, build rows, build flags

Follow Steps 1–8 from `prompts/renewals-report-template.md`.

If multiple files provided, read each and combine `records` before filtering.

For each month in the quarter, filter separately:
```python
monthly_groups = []
for (yr, mo) in q_months:
    mo_records = [r for r in records if renews_in_month(r, yr, mo)]
    mo_label = datetime(yr, mo, 1).strftime("%B %Y")
    monthly_groups.append({
        "month":        mo_label,
        "records":      mo_records,
        "invoiceTable": invoice_table_rows(mo_records),
        "totals":       period_totals(mo_records),
        "flags":        build_flags(mo_records),
        "pending":      len(mo_records) == 0,
    })
```

### 8 — Compute quarter totals (sum across all three months)

```python
all_q_records = [r for g in monthly_groups for r in g["records"]]
q_totals = period_totals(all_q_records)
```

### 9 — Save markdown summary

Save to: `data/outputs/renewals-nextquarter-YYYY-MM-DD.md`

### 10 — Write metrics JSON

Save to: `data/outputs/renewals-nextquarter-metrics-YYYY-MM-DD.json`

Use the schema from `prompts/renewals-report-template.md`. Set:
- `"period"`: e.g. `"Q3 2026"`
- `"periodType"`: `"nextquarter"`
- `"monthlyGroups"`: array of 3 group objects (see below)

Each group object:
```json
{
  "month":        "[e.g. July 2026]",
  "invoiceTable": [...],
  "totalArr":     "[fmt]",
  "totalInvoice": "[fmt]",
  "count":        "[int]",
  "pending":      false
}
```

If a month has no data (Finance sheet not yet available), set `"pending": true` and `"invoiceTable": []`.

### 11 — Generate .docx

```bash
node reports/renewals-nextquarter.js data/outputs/renewals-nextquarter-metrics-YYYY-MM-DD.json
```

Output: `out/Renewals_NextQuarter_YYYY-QN.docx`

---

## Google Drive upload (optional)

After showing the report, ask: "Want me to upload the invoice data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "Renewals Next Quarter — [Period]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

End with: "Want me to upload the invoice data to Google Sheets, share this in Slack, or tweak anything?"
