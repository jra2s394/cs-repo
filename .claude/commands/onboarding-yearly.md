---
description: Generate this year's Onboarding CARR report — YTD snapshot, YoY comparison, quarter-by-quarter, top accounts, all-time totals
---

Read `CLAUDE.md` and `prompts/onboarding-report-template.md` from this repo before starting.

Generate the **YEARLY / YTD** Onboarding report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user:
1. "What's the path to the onboarding mastersheet?" (e.g., `~/Downloads/onboarding_tracker.xlsx`)
2. "Does the sheet contain data from prior years, or just the current year?" (determines multi-year section)
3. "Do you want me to pull Asana task data too?" (default: yes)

---

## Periods

| Period | Definition |
|---|---|
| **This year (YTD)** | Jan 1 → today |
| **Prior year** | Full prior calendar year (if data in sheet) |
| **All-time** | All rows in the sheet regardless of date |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MT = ZoneInfo("America/Denver")
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

this_year       = today.year
ytd_start       = today.replace(month=1, day=1)
prior_year      = this_year - 1
prior_year_start = datetime(prior_year, 1, 1, tzinfo=MT)
prior_year_end   = datetime(this_year, 1, 1, tzinfo=MT)

date_range = f"Jan 1 – {today.strftime('%b %-d, %Y')}"

print("YTD_START:", ytd_start)
print("PRIOR_YEAR:", prior_year_start, "to", prior_year_end)
```

### 2 — Read and inspect the mastersheet

Follow Step 1 from `prompts/onboarding-report-template.md`.

### 3 — Map columns, separate backlog, and normalize data

Follow Steps 2–2.5–3–4–5 from `prompts/onboarding-report-template.md`. **Step 2.5 (backlog separation) must run before period filtering** — backlog rows are excluded from all pipeline metrics and shown in a separate section.

### 4 — Bucket records by year

```python
def get_year(r, date_field):
    d = r.get(date_field)
    return d.year if d else None

# YTD (this year — by go-live or start date, whichever is more relevant)
ytd_records    = [r for r in records if get_year(r, "go_live_date") == this_year
                   or (r["status_norm"]=="In-Flight" and get_year(r, "start_date") == this_year)]
prior_records  = [r for r in records if get_year(r, "go_live_date") == prior_year]
all_records    = records  # all rows in sheet
```

### 5 — Compute yearly metrics

```python
# YTD
carr_completed_ytd   = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==this_year and r["carr_float"])
carr_in_flight       = sum(r["carr_float"] for r in records if r["status_norm"]=="In-Flight" and r["carr_float"])
carr_at_risk         = sum(r["carr_float"] for r in records if r["status_norm"] in ("At-Risk","Blocked") and r["carr_float"])
accts_completed_ytd  = len([r for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==this_year])
accts_started_ytd    = len([r for r in records if get_year(r,"start_date")==this_year])
accts_in_flight      = len([r for r in records if r["status_norm"]=="In-Flight"])

# Prior year (for YoY)
carr_completed_py    = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==prior_year and r["carr_float"])
accts_completed_py   = len([r for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==prior_year])

# All-time
carr_all_time        = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and r["carr_float"])
accts_all_time       = len([r for r in records if r["status_norm"]=="Completed"])
total_accts          = len(records)

# Avg days to go-live
days_list = [(r["go_live_date"] - r["start_date"]).days for r in records
             if r["status_norm"]=="Completed" and r.get("start_date") and r.get("go_live_date")]
avg_days_ytd = round(sum(days_list)/len(days_list)) if days_list else None
fastest      = min(days_list) if days_list else None
longest      = max(days_list) if days_list else None
```

### 6 — Build multi-year table

Include current year (YTD), prior year, and any earlier years present in the sheet.

```python
years_in_sheet = sorted(set(get_year(r, "go_live_date") for r in records if get_year(r, "go_live_date")), reverse=True)
multi_year_table = []
for y in years_in_sheet:
    is_ytd = (y == this_year)
    yr_started   = len([r for r in records if get_year(r,"start_date")==y])
    yr_completed = len([r for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==y])
    yr_carr_comp = fmt_carr(sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==y and r["carr_float"]))
    yr_carr_if   = fmt_carr(carr_in_flight) if is_ytd else "—"
    yr_days      = round(sum((r["go_live_date"]-r["start_date"]).days for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==y and r.get("start_date") and r.get("go_live_date")) / max(1, len([r for r in records if r["status_norm"]=="Completed" and get_year(r,"go_live_date")==y and r.get("start_date")]))) if any(r.get("start_date") and r["status_norm"]=="Completed" and get_year(r,"go_live_date")==y for r in records) else "—"
    multi_year_table.append([f"{y}{'*' if is_ytd else ''}", str(yr_started), str(yr_completed), yr_carr_comp, yr_carr_if, f"{yr_days}d" if yr_days != "—" else "—"])
```

If prior-year data is not in the sheet, note this clearly and build a single-year table.

### 7 — Build quarter-by-quarter table (this year only)

```python
from calendar import monthrange
quarterly_table = []
for q_idx in range(4):
    q_mo_start = (q_idx * 3) + 1
    q_start = datetime(this_year, q_mo_start, 1, tzinfo=MT)
    q_end_mo = q_mo_start + 2
    _, q_end_day = monthrange(this_year, q_end_mo)
    q_end = datetime(this_year, q_end_mo, q_end_day, tzinfo=MT)
    label = f"Q{q_idx+1} {this_year}"
    if q_start > today:
        quarterly_table.append([label, "—", "—", "—", "—"])
        continue
    q_end = min(q_end, today)
    q_started   = len([r for r in records if r.get("start_date") and q_start.date() <= r["start_date"] <= q_end.date()])
    q_completed = len([r for r in records if r["status_norm"]=="Completed" and r.get("go_live_date") and q_start.date() <= r["go_live_date"] <= q_end.date()])
    q_carr_comp = fmt_carr(sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and r.get("go_live_date") and q_start.date() <= r["go_live_date"] <= q_end.date() and r["carr_float"]))
    quarterly_table.append([label, str(q_started), str(q_completed), q_carr_comp, fmt_carr(carr_in_flight) if q_idx == (today.month-1)//3 else "—"])
```

### 8 — Build top accounts table

Top 10 completed accounts by CARR (all-time or YTD, whichever makes sense given data):

```python
completed = [r for r in records if r["status_norm"]=="Completed" and r["carr_float"]]
top_accounts = sorted(completed, key=lambda r: r["carr_float"], reverse=True)[:10]
top_accounts_table = [
    [str(i+1), r["customer"], r["project"], r["carr_fmt"], "Completed"]
    for i, r in enumerate(top_accounts)
]
```

### 9 — Build allTimeStats

```python
top_by_carr = max(records, key=lambda r: r["carr_float"] or 0, default=None)
all_time_stats = {
    "accountsCompleted":  str(accts_all_time),
    "carrOnboarded":      fmt_carr(carr_all_time),
    "activeAccounts":     str(accts_in_flight),
    "carrInFlight":       fmt_carr(carr_in_flight),
    "avgDaysToGoLive":    f"{avg_days_ytd}d" if avg_days_ytd else "—",
    "fastestGoLive":      f"{fastest}d" if fastest else "—",
    "longestOnboarding":  f"{longest}d" if longest else "—",
    "topAccountByCarr":   f"{top_by_carr['customer']} ({top_by_carr['carr_fmt']})" if top_by_carr else "—",
    "totalAccounts":      str(total_accts),
}
```

### 10 — Pull Asana data (high-level only)

Get total onboarding tasks across all accounts: complete, open, overdue. No per-customer breakdown needed at this level.

### 11 — Build atRisk list (same pattern as other periods)

### 12 — Save markdown summary

Save to: `data/outputs/onboarding-yearly-YYYY-MM-DD.md`

### 13 — Write metrics JSON

Save to: `data/outputs/onboarding-yearly-metrics-YYYY-MM-DD.json`

```json
{
  "period":     "[e.g. 2026 YTD]",
  "dateRange":  "[e.g. Jan 1 – May 26, 2026]",
  "generated":  "[e.g. May 26, 2026]",
  "preparedBy": "[Your Name]",
  "sourceFile": "[filename]",
  "kpis": [
    { "value": "[carr_completed_ytd fmt]", "label": "CARR Onboarded",    "delta": "[YoY delta or '— no prior']" },
    { "value": "[carr_in_flight fmt]",     "label": "CARR In-Flight",     "delta": "[accts_in_flight] accounts" },
    { "value": "[accts_completed_ytd]",    "label": "Completed YTD",      "delta": "[YoY delta]" },
    { "value": "[avg_days_ytd or '—']d",   "label": "Avg Days to Go-Live","delta": "[YoY delta or '—']" }
  ],
  "multiYearTable": [
    ["[YYYY*]", "[started]", "[completed]", "[CARR onboarded fmt]", "[CARR in-flight fmt]", "[avg days]d"]
  ],
  "quarterlyTable": [
    ["Q1 [year]", "[started]", "[completed]", "[CARR completed fmt]", "[CARR in-flight fmt]"],
    ["Q2 [year]", "...", "...", "...", "..."],
    ["Q3 [year]", "...", "...", "...", "..."],
    ["Q4 [year]", "...", "...", "...", "..."]
  ],
  "topAccountsTable": [
    ["[rank]", "[customer]", "[project]", "[CARR fmt]", "Completed"]
  ],
  "allTimeStats": {
    "accountsCompleted":  "[int]",
    "carrOnboarded":      "[fmt]",
    "activeAccounts":     "[int]",
    "carrInFlight":       "[fmt]",
    "avgDaysToGoLive":    "[X]d",
    "fastestGoLive":      "[X]d",
    "longestOnboarding":  "[X]d",
    "topAccountByCarr":   "[Customer ($CARR)]",
    "totalAccounts":      "[int]"
  },
  "atRisk": [
    { "customer": "[name]", "project": "[project]", "carr": "[fmt]", "issue": "[description]", "urgent": true }
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
    "period":        "[e.g. Jan 1 – May 26, 2026 (all-time: all rows in sheet)]"
  }
}
```

### 14 — Generate .docx

```bash
node reports/onboarding-yearly.js data/outputs/onboarding-yearly-metrics-YYYY-MM-DD.json
```

Output: `out/Onboarding_YTD_YYYY.docx`

Convert to PDF *(skip if LibreOffice not installed)*:
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/Onboarding_YTD_YYYY.docx
```

---

## Google Drive upload (optional)

After showing the report, ask: "Want me to upload the data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "Onboarding Year-to-Date — [Year]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

End with: "Want me to upload the data to Google Sheets, share this in Slack, or tweak anything?"
