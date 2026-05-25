---
description: Generate this quarter's Onboarding CARR report — QoQ scorecard + monthly breakdown + YTD context
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/onboarding-report-template.md` from this repo before starting.

Generate the **QUARTERLY** Onboarding report for Slabstack CS Intelligence.

---

## Before You Start

Ask the user:
1. "What's the path to the onboarding mastersheet?" (e.g., `~/Downloads/onboarding_tracker.xlsx`)
2. "Do you want me to pull Asana task data too?" (default: yes)

---

## Periods

| Period | Definition |
|---|---|
| **This quarter** | 1st of current quarter → today |
| **Last quarter** | Full prior calendar quarter |
| **YTD context** | Jan 1 → today |

---

## Step-by-step Instructions

### 1 — Calculate timestamps

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

q = (today.month - 1) // 3                       # 0=Q1,1=Q2,2=Q3,3=Q4
this_q_start = today.replace(month=(q*3)+1, day=1)
this_q_label = f"Q{q+1} {today.year}"

# Last quarter
lq = q - 1
lq_year = today.year if lq >= 0 else today.year - 1
lq = lq % 4
last_q_start = today.replace(year=lq_year, month=(lq*3)+1, day=1)
last_q_end   = this_q_start
last_q_label = f"Q{lq+1} {lq_year}"

ytd_start = today.replace(month=1, day=1)

date_range = f"{this_q_start.strftime('%b %-d')} – {today.strftime('%b %-d, %Y')}"

print("THIS_Q_START:", this_q_start, "|", this_q_label)
print("LAST_Q_START:", last_q_start, "|", last_q_label)
print("LAST_Q_END:  ", last_q_end)
print("YTD_START:   ", ytd_start)
```

### 2 — Read and inspect the mastersheet

Follow Step 1 from `prompts/onboarding-report-template.md`.

### 3 — Map columns, separate backlog, and normalize data

Follow Steps 2–2.5–3–4–5 from `prompts/onboarding-report-template.md`. **Step 2.5 (backlog separation) must run before period filtering** — backlog rows are excluded from all pipeline metrics and shown in a separate section.

### 4 — Filter records by period

```python
def in_this_q(date_field):
    return date_field is not None and this_q_start.date() <= date_field <= today.date()

def in_last_q(date_field):
    return date_field is not None and last_q_start.date() <= date_field < last_q_end.date()

def in_ytd(date_field):
    return date_field is not None and ytd_start.date() <= date_field <= today.date()
```

### 5 — Compute quarterly metrics

```python
# This quarter
carr_completed_tq   = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and in_this_q(r.get("go_live_date")) and r["carr_float"])
carr_started_tq     = sum(r["carr_float"] for r in records if in_this_q(r.get("start_date")) and r["carr_float"])
carr_in_flight      = sum(r["carr_float"] for r in records if r["status_norm"]=="In-Flight" and r["carr_float"])
carr_at_risk        = sum(r["carr_float"] for r in records if r["status_norm"] in ("At-Risk","Blocked") and r["carr_float"])

accts_completed_tq  = len([r for r in records if r["status_norm"]=="Completed" and in_this_q(r.get("go_live_date"))])
accts_started_tq    = len([r for r in records if in_this_q(r.get("start_date"))])
accts_in_flight     = len([r for r in records if r["status_norm"]=="In-Flight"])

# Last quarter (for QoQ comparison)
carr_completed_lq   = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and in_last_q(r.get("go_live_date")) and r["carr_float"])
accts_completed_lq  = len([r for r in records if r["status_norm"]=="Completed" and in_last_q(r.get("go_live_date"))])
accts_started_lq    = len([r for r in records if in_last_q(r.get("start_date"))])

# YTD
carr_completed_ytd  = sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and in_ytd(r.get("go_live_date")) and r["carr_float"])
accts_completed_ytd = len([r for r in records if r["status_norm"]=="Completed" and in_ytd(r.get("go_live_date"))])

# Avg days to go-live
days_list = []
for r in records:
    if r["status_norm"]=="Completed" and r.get("start_date") and r.get("go_live_date"):
        days_list.append((r["go_live_date"] - r["start_date"]).days)
avg_days_tq = round(sum(days_list)/len(days_list)) if days_list else None

# YoY: note if prior-year data is unavailable in the sheet
carr_completed_yoy = None  # set if prior year data found in sheet
```

### 6 — Build monthly breakdown (within this quarter)

Compute per-month metrics for the 3 months of the current quarter. For future months use "—".

```python
from calendar import monthrange

months_in_q = [(this_q_start.year, this_q_start.month + i) for i in range(3)]
monthly_table = []
for (yr, mo) in months_in_q:
    mo_start = datetime(yr, mo, 1, tzinfo=MT)
    _, last_day = monthrange(yr, mo)
    mo_end = datetime(yr, mo, last_day, tzinfo=MT)
    if mo_start > today:
        monthly_table.append([mo_start.strftime("%B %Y"), "—", "—", "—", "—"])
        continue
    mo_end = min(mo_end, today)
    mo_started   = len([r for r in records if r.get("start_date") and mo_start.date() <= r["start_date"] <= mo_end.date()])
    mo_completed = len([r for r in records if r["status_norm"]=="Completed" and r.get("go_live_date") and mo_start.date() <= r["go_live_date"] <= mo_end.date()])
    mo_carr_comp = fmt_carr(sum(r["carr_float"] for r in records if r["status_norm"]=="Completed" and r.get("go_live_date") and mo_start.date() <= r["go_live_date"] <= mo_end.date() and r["carr_float"]))
    monthly_table.append([mo_start.strftime("%B %Y"), str(mo_started), str(mo_completed), mo_carr_comp, fmt_carr(carr_in_flight)])
```

### 7 — Build accountsTable (accounts active this quarter)

Include accounts that started or went live this quarter, plus all currently In-Flight.
Columns: Customer | Project | CARR | Started | Completed | Status

```python
def fmt_date_short(d):
    return d.strftime("%-m/%-d") if d else "—"
```

### 8 — Pull Asana data (optional — summary level only for quarterly)

Summary-level only: total tasks due this quarter, complete, overdue. Skip per-customer detail.

### 9 — Build atRisk list (same pattern as weekly/monthly)

### 10 — Save markdown summary

Save to: `data/outputs/onboarding-quarterly-YYYY-MM-DD.md`

### 11 — Write metrics JSON

Save to: `data/outputs/onboarding-quarterly-metrics-YYYY-MM-DD.json`

```json
{
  "period":     "[e.g. Q2 2026]",
  "dateRange":  "[e.g. Apr 1 – May 26, 2026]",
  "generated":  "[e.g. May 26, 2026]",
  "preparedBy": "[Your Name]",
  "sourceFile": "[filename]",
  "kpis": [
    { "value": "[carr_completed_tq fmt]", "label": "CARR Completed",  "delta": "[QoQ delta]" },
    { "value": "[carr_in_flight fmt]",    "label": "CARR In-Flight",   "delta": "[accts_in_flight] accounts" },
    { "value": "[accts_completed_tq]",    "label": "Completed",        "delta": "[QoQ delta]" },
    { "value": "[carr_completed_ytd fmt]","label": "Pipeline CARR",    "delta": "YTD total" }
  ],
  "priorPeriod": "[e.g. Q1 2026]",
  "scorecardTable": [
    ["CARR Completed",    "[tq fmt]", "[lq fmt]", "[delta]", "[yoy or '—']"],
    ["CARR In-Flight",    "[fmt]",    "—",        "—",       "—"],
    ["CARR At-Risk",      "[fmt]",    "—",        "—",       "—"],
    ["Accounts Completed","[tq]",     "[lq]",     "[delta]", "[yoy or '—']"],
    ["Accounts Started",  "[tq]",     "[lq]",     "[delta]", "—"],
    ["Avg Days to Go-Live","[avg]d",  "—",        "—",       "—"]
  ],
  "monthlyTable": [
    ["[Month Year]", "[started]", "[completed]", "[CARR completed fmt]", "[CARR in-flight fmt]"]
  ],
  "accountsTable": [
    ["[customer]", "[project]", "[carr fmt]", "[start date]", "[go-live date or '—']", {"text":"[status]","fill":"...","color":"...","bold":true}]
  ],
  "ytdContext": "[e.g. YTD 2026: $X.Xk CARR completed, X accounts, X in-flight]",
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
    "period":        "[e.g. Apr 1 – May 26, 2026]"
  }
}
```

### 12 — Generate .docx

```bash
node reports/onboarding-quarterly.js data/outputs/onboarding-quarterly-metrics-YYYY-MM-DD.json
```

Output: `out/Onboarding_Quarterly_YYYY-QN.docx`

Then run **Standard Build & Distribute** from `prompts/onboarding-report-template.md` (PDF conversion + Google Drive upload prompt + closing line).
