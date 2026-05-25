---
description: Generate this month's Onboarding CARR report — MoM comparison + week-by-week breakdown + QTD context
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/onboarding-report-template.md` from this repo before starting.

Generate the **MONTHLY** Onboarding report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user:
1. "What's the path to the onboarding mastersheet?" (e.g., `~/Downloads/onboarding_tracker.xlsx`)
2. "Do you want me to pull Asana task data too?" (default: yes)

---

## Periods

| Period | Definition |
|---|---|
| **This month** | 1st → today |
| **Last month** | Full prior calendar month |
| **QTD context** | 1st of current quarter → today |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

this_month_start = today.replace(day=1)
this_month_label = today.strftime("%B %Y")

last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
last_month_end   = this_month_start
last_month_label = last_month_start.strftime("%B %Y")

q = (today.month - 1) // 3
qtd_start = today.replace(month=(q * 3) + 1, day=1)
qtd_label = f"Q{q+1} {today.year}"

date_range = f"{this_month_start.strftime('%B %-d')} – {today.strftime('%-d, %Y')}"

print("THIS_MONTH_START:", this_month_start, "|", this_month_label)
print("LAST_MONTH_START:", last_month_start, "|", last_month_label)
print("QTD_START:", qtd_start, "|", qtd_label)
```

### 2 — Read and inspect the mastersheet

Follow Step 1 from `prompts/onboarding-report-template.md`.

### 3 — Map columns, separate backlog, and normalize data

Follow Steps 2–2.5–3–4–5 from `prompts/onboarding-report-template.md`. **Step 2.5 (backlog separation) must run before period filtering** — backlog rows are excluded from all pipeline metrics and shown in a separate section.

### 4 — Filter records by period

```python
def in_this_month(date_field):
    return date_field is not None and this_month_start.date() <= date_field <= today.date()

def in_last_month(date_field):
    return date_field is not None and last_month_start.date() <= date_field < last_month_end.date()

def in_qtd(date_field):
    return date_field is not None and qtd_start.date() <= date_field <= today.date()
```

If no date columns exist, report on current status snapshot only and note the limitation.

### 5 — Compute monthly metrics

```python
# This month
carr_completed_tm   = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and in_this_month(r.get("go_live_date")) and r["carr_float"])
carr_started_tm     = sum(r["carr_float"] for r in records if in_this_month(r.get("start_date")) and r["carr_float"])
carr_in_flight      = sum(r["carr_float"] for r in records if r["status_norm"]=="In-Flight" and r["carr_float"])
carr_at_risk        = sum(r["carr_float"] for r in records if r["status_norm"] in ("At-Risk","Blocked") and r["carr_float"])

accts_completed_tm  = len([r for r in records if r["status_norm"]=="Completed" and in_this_month(r.get("go_live_date"))])
accts_started_tm    = len([r for r in records if in_this_month(r.get("start_date"))])
accts_in_flight     = len([r for r in records if r["status_norm"]=="In-Flight"])

# Last month (for MoM comparison)
carr_completed_lm   = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and in_last_month(r.get("go_live_date")) and r["carr_float"])
accts_completed_lm  = len([r for r in records if r["status_norm"]=="Completed" and in_last_month(r.get("go_live_date"))])
accts_started_lm    = len([r for r in records if in_last_month(r.get("start_date"))])

# Avg days to go-live (completed accounts with both dates)
days_list = []
for r in records:
    if r["status_norm"]=="Completed" and r.get("start_date") and r.get("go_live_date"):
        days_list.append((r["go_live_date"] - r["start_date"]).days)
avg_days = round(sum(days_list)/len(days_list)) if days_list else None
```

### 6 — Build week-by-week breakdown

Divide the current month into calendar weeks (Mon–Sun) and compute CARR + account counts per week:

```python
# Find week boundaries within this month
weeks = []
wk_start = this_month_start
while wk_start <= today:
    wk_end = min(wk_start + timedelta(days=6), today)
    label = f"{wk_start.strftime('%-m/%-d')}–{wk_end.strftime('%-m/%-d')}"
    wk_carr_completed = sum(r["carr_float"] for r in records
                            if r["status_norm"]=="Completed"
                            and r.get("go_live_date")
                            and wk_start.date() <= r["go_live_date"] <= wk_end.date()
                            and r["carr_float"])
    wk_started = len([r for r in records if r.get("start_date") and wk_start.date() <= r["start_date"] <= wk_end.date()])
    wk_completed = len([r for r in records if r["status_norm"]=="Completed" and r.get("go_live_date") and wk_start.date() <= r["go_live_date"] <= wk_end.date()])
    weeks.append([label, str(wk_started), str(wk_completed), fmt_carr(wk_carr_completed), fmt_carr(carr_in_flight)])
    wk_start += timedelta(days=7)
```

### 7 — Pull Asana data

Follow Step 6 from `prompts/onboarding-report-template.md`. Build `asanaTable` with Notes column.

### 8 — Build accountsTable

Include accounts that started or went live this month, plus all currently In-Flight accounts.
Columns: Customer | Project | CARR | Status | Start Date

```python
# Start date display: format as "May 1" or "—" if missing
def fmt_date(d):
    return d.strftime("%-m/%-d/%Y") if d else "—"
```

### 9 — Build atRisk list (same as weekly)

### 10 — Save markdown summary

Save to: `data/outputs/onboarding-monthly-YYYY-MM-DD.md`

### 11 — Write metrics JSON

Save to: `data/outputs/onboarding-monthly-metrics-YYYY-MM-DD.json`

```json
{
  "period":     "[e.g. May 2026]",
  "dateRange":  "[e.g. May 1 – May 26, 2026]",
  "generated":  "[e.g. May 26, 2026]",
  "preparedBy": "[Your Name]",
  "sourceFile": "[filename]",
  "kpis": [
    { "value": "[carr_completed_tm fmt]", "label": "CARR Completed",    "delta": "[MoM delta]" },
    { "value": "[carr_in_flight fmt]",    "label": "CARR In-Flight",     "delta": "[accts_in_flight] accounts" },
    { "value": "[accts_completed_tm]",    "label": "Completed",          "delta": "[MoM delta]" },
    { "value": "[avg_days or '—']d",      "label": "Avg Days to Go-Live","delta": "[MoM delta or 'no prior']" }
  ],
  "priorPeriod": "[e.g. April 2026]",
  "summaryTable": [
    ["CARR Completed",    "[tm fmt]", "[lm fmt]", "[delta]"],
    ["CARR In-Flight",    "[fmt]",    "—",        "—"],
    ["CARR At-Risk",      "[fmt]",    "—",        "—"],
    ["Accounts Completed","[tm]",     "[lm]",     "[delta]"],
    ["Accounts Started",  "[tm]",     "[lm]",     "[delta]"],
    ["Accounts In-Flight","[count]",  "—",        "—"],
    ["Avg Days to Go-Live","[avg]d",  "—",        "—"]
  ],
  "weeklyTable": [
    ["[e.g. 5/1–5/7]",   "[started]", "[completed]", "[CARR completed fmt]", "[CARR in-flight fmt]"],
    ["[e.g. 5/8–5/14]",  "...", "...", "...", "..."]
  ],
  "accountsTable": [
    ["[customer]", "[project]", "[carr fmt]", {"text":"[status]","fill":"...","color":"...","bold":true}, "[start date]"]
  ],
  "qtdContext": "[e.g. Q2 2026: $X.Xk CARR completed (X accounts, 26 days elapsed of ~91)]",
  "atRisk": [
    { "customer": "[name]", "project": "[project]", "carr": "[fmt]", "issue": "[description]", "urgent": true }
  ],
  "asanaTable": [
    ["[category]", "[complete]", "[open]", "[overdue]", "[notes]"]
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
    "period":        "[e.g. May 1 – May 26, 2026]"
  }
}
```

### 12 — Generate .docx

```bash
node reports/onboarding-monthly.js data/outputs/onboarding-monthly-metrics-YYYY-MM-DD.json
```

Output: `out/Onboarding_Monthly_YYYY-MM.docx`

Then run **Standard Build & Distribute** from `prompts/onboarding-report-template.md` (PDF conversion + Google Drive upload prompt + closing line).
