---
description: Generate this quarter's Intercom support intelligence report — QoQ comparison + YTD context and trend analysis
---

Read `CLAUDE.md` and `prompts/intercom-report-template.md` from this repo before starting.

Generate the **QUARTERLY** Intercom report for Slabstack CS Intelligence.

---

## Periods

| Period | Definition |
|---|---|
| **Current** | This quarter: Q start → today |
| **Prior** | Last quarter: full quarter |
| **YTD context** | Year-to-date totals |
| **All-time context** | Total conversation count since Intercom launch |

---

## Step-by-step instructions

### 1 — Calculate timestamps
```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import calendar

MT = ZoneInfo("America/Denver")  # handles MDT/MST + DST automatically
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

# Current quarter
q_current = (today.month - 1) // 3  # 0=Q1 .. 3=Q4
this_q_start = today.replace(month=q_current * 3 + 1, day=1)
q_label = f"Q{q_current + 1} {today.year}"

# Prior quarter (start only — the bucket upper bound is this_q_start)
if q_current == 0:
    last_q_start = today.replace(year=today.year - 1, month=10, day=1)
    last_q_label = f"Q4 {today.year - 1}"
else:
    last_q_start = today.replace(month=(q_current - 1) * 3 + 1, day=1)
    last_q_label = f"Q{q_current} {today.year}"

# Same quarter last year (YoY window)
same_q_ly_start = this_q_start.replace(year=today.year - 1)
sq_end_month = same_q_ly_start.month + 2
sq_end_day = calendar.monthrange(today.year - 1, sq_end_month)[1]
same_q_ly_end = same_q_ly_start.replace(month=sq_end_month, day=sq_end_day) + timedelta(days=1) - timedelta(seconds=1)

# YTD
ytd_start = today.replace(month=1, day=1)

print(f"THIS_Q_START_TS: {int(this_q_start.timestamp())} | {q_label}")
print(f"LAST_Q_START_TS: {int(last_q_start.timestamp())} | {last_q_label}")
print(f"SAME_Q_LAST_YEAR_START_TS: {int(same_q_ly_start.timestamp())}")
print(f"SAME_Q_LAST_YEAR_END_TS: {int(same_q_ly_end.timestamp())}")
print(f"YTD_START_TS: {int(ytd_start.timestamp())}")
print(f"EARLIEST_START_TS: {int(same_q_ly_start.timestamp())}  (= same quarter last year)")
```

### 2 — Pull conversations from the earliest period start
Run **Standard Step 2** from the template with `START_TS = EARLIEST_START_TS` (= same quarter last year — covers this quarter, last quarter, same quarter last year, and YTD). Paginate fully — this spans ~15 months and will be several hundred conversations.

### 3 — Bucket the results in Python
Split the single pull by each conversation's `created_at`:
- **This quarter** = `created_at >= THIS_Q_START_TS`
- **Last quarter** = `LAST_Q_START_TS <= created_at < THIS_Q_START_TS`
- **Same quarter last year** = `SAME_Q_LAST_YEAR_START_TS <= created_at <= SAME_Q_LAST_YEAR_END_TS`
- **YTD** = `created_at >= YTD_START_TS`

### 4 — Pull currently OPEN conversations
Run **Standard Step 4** from the template.

### 5 — Pull KB articles
Run **Standard Step 5** from the template.

### 6 — Compute all metrics
Apply all formulas from `prompts/intercom-report-template.md`.

Quarterly-specific additions:
- Month-by-month breakdown within the quarter
- QoQ delta for EVERY metric (not just volume)
- YoY delta for same quarter (year-over-year)
- Identify whether this quarter is trending better or worse than last
- Calculate the "pace" metric: conversations per working day this quarter vs last quarter
- Top 10 customers by conversation volume this quarter
- Top 5 recurring issue categories — have they changed vs last quarter?
- Fin AI trend: is adoption increasing quarter over quarter?
- KB health: articles added or updated this quarter vs last quarter
- Team workload: conversations per admin (by admin_assignee_id frequency)

### 7 — Format and save
Period label: `QUARTERLY REPORT`
Date range: `[Q Label] ([Start Month Day] – [Today Month Day, Year])`

Save to: `data/outputs/intercom-quarterly-YYYY-MM-DD.md`

---

## Quarterly-specific additions to the standard format

**Replace or augment the Volume Trend section:**

```
▌ MONTHLY BREAKDOWN (This Quarter)

  Month         New    Closed   Resolution%  Avg Response  Fin%
  ──────────────────────────────────────────────────────────────
  [Month 1]     XX     XX       XX%          X.X min       XX%
  [Month 2]     XX     XX       XX%          X.X min       XX%
  [Month 3]*    XX     XX       XX%          X.X min       XX%  *month in progress
  ──────────────────────────────────────────────────────────────
  Q Total       XXX    XXX      XX%          X.X min       XX%

  Trend within quarter:  ▲ improving / ▼ degrading / — stable


▌ QUARTER-OVER-QUARTER SCORECARD

  Metric                    [This Q]   [Last Q]   Δ        YoY (same Q last year)
  ──────────────────────────────────────────────────────────────────────────────
  Total Conversations       XXX        XXX        ▲/▼X%    ▲/▼X%
  Closed                    XXX        XXX        ▲/▼X%    ▲/▼X%
  Resolution Rate           XX.X%      XX.X%      ▲/▼Xpt   ▲/▼Xpt
  Avg First Response        X.X min    X.X min    ▲/▼X%    ▲/▼X%
  Avg Time to Close         X.X hrs    X.X hrs    ▲/▼X%    ▲/▼X%
  Reopen Rate               X.X%       X.X%       ▲/▼Xpt   ▲/▼Xpt
  Fin AI Participation      XX%        XX%        ▲/▼Xpt   ▲/▼Xpt
  Unique Contacts           XX         XX         ▲/▼X%    ▲/▼X%
  Unique Tenants (domains)  XX         XX         ▲/▼X%    ▲/▼X%
  Convs per Working Day     X.X        X.X        ▲/▼X%    ▲/▼X%


▌ TOP CUSTOMERS THIS QUARTER

  Rank  Tenant/Domain          Conversations   Open   Predominant Issue
  ────────────────────────────────────────────────────────────────────
  1.    [domain]               XX              X      [Category]
  2.    [domain]               XX              X      [Category]
  ...   (top 10)


▌ ISSUE TREND: THIS QUARTER vs LAST QUARTER

  Category               This Q   Last Q   Δ
  ────────────────────────────────────────────
  [Category 1]           XX       XX       ▲/▼
  [Category 2]           XX       XX       ▲/▼
  ...

  Emerging issues (new this quarter, not in top-10 last quarter):
  · [Category] — XX conversations
  Resolved patterns (top-10 last Q, not this Q):
  · [Category] — dropped from XX to XX


▌ YEAR-TO-DATE SUMMARY ([Year])

  Total conversations YTD:    X,XXX
  Total closed YTD:           X,XXX
  Overall resolution rate:    XX.X%
  Total unique contacts:      XXX
  Total unique tenants:       XX
  KB articles in help center: XX (XX published, XX draft)
  Fin AI participation rate:  XX% (trending ▲/▼)
```

---

## Accuracy rules
- Paginate completely for all quarters — partial data will produce incorrect QoQ deltas
- Working day count: use 5 days/week, exclude weekends from "convs per working day" calc
- For YoY comparison, align the period end to the same day of the quarter (e.g., if today is day 52 of Q2, compare to day 52 of Q2 last year)
- If same-quarter last year data is unavailable or sparse, note it — don't fabricate the comparison
- All times in Mountain Time

---

If any MCP call fails, note which one and proceed with what is available.

---

## Step 8 — Generate branded .docx

After saving the markdown report, write the metrics JSON and generate the themed document.

**a) Write `data/outputs/intercom-quarterly-metrics-[YYYY-QN].json`** — fill every `[placeholder]` from steps 3–6:

```json
{
  "period":     "[e.g. Q2 2026]",
  "dateRange":  "[e.g. Apr 1 – May 21, 2026]",
  "generated":  "[e.g. May 21, 2026]",
  "preparedBy": "YOUR NAME",
  "kpis": [
    { "value": "[this Q count]", "label": "This Quarter", "delta": "[QoQ delta]" },
    { "value": "[res%]",         "label": "Resolution",   "delta": "[QoQ delta]" },
    { "value": "[avg close]",    "label": "Avg Close",    "delta": "[QoQ delta]", "deltaColor": "2E7D32" },
    { "value": "[domains]",      "label": "Domains",      "delta": "[QoQ delta]" }
  ],
  "priorPeriod": "[e.g. Q1 2026]",
  "scorecardTable": [
    ["Conversations",         "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Closed",                "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Resolution Rate",       "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Avg First Response",    "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Avg Time to Close",     "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Reopen Rate",           "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Fin AI Participation",  "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Unique Contacts",       "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Unique Domains",        "[this Q]", "[last Q]", "[delta]", "[YoY]"],
    ["Convs per Working Day", "[this Q]", "[last Q]", "[delta]", "[YoY]"]
  ],
  "monthlyTable": [
    ["[Month 1]",           "[new]", "[closed]", "[res%]", "[avg FRT]", "[fin%]"],
    ["[Month 2]",           "[new]", "[closed]", "[res%]", "[avg FRT]", "[fin%]"],
    ["[Month 3] (partial)", "[new]", "[closed]", "[res%]", "[avg FRT]", "[fin%]"]
  ],
  "topCustomers": [
    ["1", "[domain]", "[count]"],
    ["2", "[domain]", "[count]"]
  ],
  "ytdContext": "[e.g. YTD 2026: 572 conversations, 64 domains, 99.0% resolution]",
  "recs": [
    { "num": 1, "title": "[title]", "tag": "[e.g. ACTION]", "tagColor": "B23A2E", "body": "[body]" }
  ],
  "methodology": {
    "pages":         [pages fetched],
    "conversations": [conversations in window],
    "period":        "[e.g. Jan 1, 2025 – May 21, 2026]"
  }
}
```

**b) Build the .docx:**
```bash
node reports/intercom-quarterly.js data/outputs/intercom-quarterly-metrics-[YYYY-QN].json
```
Output: `out/Intercom_Quarterly_[YYYY-QN].docx`

**c) PDF, Drive upload, closing prompt** — run **Standard Build & Distribute** from the template.
