---
description: Generate this month's Intercom support intelligence report — MoM comparison + QTD and YTD context
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/intercom-report-template.md` from this repo before starting.

Generate the **MONTHLY** Intercom report for Slabstack CS Intelligence.

---

## Periods

| Period | Definition |
|---|---|
| **Current** | This month: 1st → today |
| **Prior** | Last month: full calendar month |
| **QTD context** | Quarter-to-date (1st of current quarter → today) |
| **YTD context** | Year-to-date (Jan 1 → today) |

---

## Step-by-step instructions

### 1 — Calculate timestamps
```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")  # ZoneInfo handles DST automatically
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

# This month
this_month_start = today.replace(day=1)
this_month_label = today.strftime("%B %Y")  # e.g., "May 2026"

# Last month (subtract a full day so the time stays at midnight, then snap to the 1st)
last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
last_month_label = last_month_start.strftime("%B %Y")

# QTD: current quarter start
q = (today.month - 1) // 3  # 0=Q1, 1=Q2, 2=Q3, 3=Q4
qtd_start = today.replace(month=(q * 3) + 1, day=1)
qtd_label = f"Q{q+1} {today.year}"

# YTD
ytd_start = today.replace(month=1, day=1)

# Earliest start needed for the single conversations pull
earliest = min(last_month_start, ytd_start)

print("THIS_MONTH_START_TS:", int(this_month_start.timestamp()), "|", this_month_label)
print("LAST_MONTH_START_TS:", int(last_month_start.timestamp()), "|", last_month_label)
print("QTD_START_TS:", int(qtd_start.timestamp()), "|", qtd_label)
print("YTD_START_TS:", int(ytd_start.timestamp()))
print("EARLIEST_START_TS:", int(earliest.timestamp()), earliest.strftime("%Y-%m-%d"))
```

### 2 — Pull conversations from the earliest period start
Run **Standard Step 2** from the template with `START_TS = EARLIEST_START_TS` (covers last month, this month, QTD, and YTD). Paginate fully — YTD data will far exceed a single page. If the pull exceeds 750 conversations, note the count and flag if results may be partial.

### 3 — Bucket the results in Python
Split the single pull by each conversation's `created_at`:
- **This month** = `created_at >= THIS_MONTH_START_TS`
- **Last month** = `LAST_MONTH_START_TS <= created_at < THIS_MONTH_START_TS`
- **QTD** = `created_at >= QTD_START_TS`
- **YTD** = `created_at >= YTD_START_TS`

### 4 — Pull currently OPEN conversations
Run **Standard Step 4** from the template.

### 5 — Pull KB articles
Run **Standard Step 5** from the template.

### 6 — Compute all metrics
Apply all formulas from `prompts/intercom-report-template.md`.

Monthly-specific additions:
- Week-by-week breakdown within the current month (Week 1, Week 2, etc.)
- Identify the highest-volume week in the month
- Month-over-month trend for ALL metrics (not just conversation count)
- List top 5 most active customers this month (by conversation count)
- List top 5 most common issue types this month vs last month
- Unique tenant domains this month vs last month
- Calculate approximate days-to-close average (time_to_first_close / 86400 for closed convs)

### 7 — Format and save
Period label: `MONTHLY REPORT`
Date range: `[Month Year]  (1 [Month] → [Day Month Year])`

Save to: `data/outputs/intercom-monthly-YYYY-MM-DD.md`

---

## Monthly-specific additions to the standard format

**Add after Day-by-Day section, a Week-by-Week breakdown:**

```
▌ WEEK-BY-WEEK VOLUME ([Month Year])

  Week         Dates           Conversations   Closed   Open
  ──────────────────────────────────────────────────────────
  Week 1       [M/D – M/D]     XX              XX       XX
  Week 2       [M/D – M/D]     XX              XX       XX
  Week 3       [M/D – M/D]     XX              XX       XX
  Week 4       [M/D – M/D]     XX              XX       XX  [current if applicable]
  ──────────────────────────────────────────────────────────
  Month Total                  XX              XX       —

  Highest volume week: Week X  ([M/D – M/D], XX conversations)
  Most common issue that week: [Category]


▌ CUSTOMER ACTIVITY (This Month)

  Most active tenants by conversation count:
  1. [Domain / Customer Name]  —  XX conversations  —  [🔴 if any still open]
  2. [Domain / Customer Name]  —  XX conversations
  3. [Domain / Customer Name]  —  XX conversations
  4. [Domain / Customer Name]  —  XX conversations
  5. [Domain / Customer Name]  —  XX conversations

  New customers this month (first conversation ever or first this year):
  · [Customer name / domain]  —  "[Issue type]"
  [flag 🟡 if a new customer has an open/unresolved conversation]


▌ CONTEXT: QUARTER-TO-DATE ([QTD Label])

  Conversations this quarter:  XX  ([days] days elapsed of ~91)
  Pace vs last quarter:        XX/day this Q vs XX/day last Q  (▲/▼X%)
  Projected quarter total:     ~XX  (extrapolated at current pace)


▌ CONTEXT: YEAR-TO-DATE ([Year])

  Total conversations:    X,XXX
  Total closed:           X,XXX
  Avg resolution rate:    XX.X%
  Unique contacts (users): XXX
  Unique tenants (domains): XX
  KB articles published:   XX
```

---

## Accuracy rules
- Paginate fully for monthly data — do not estimate from a single page
- When computing MoM delta, use the same metric formula for both months
- For "new customers," cross-reference against prior months — this requires judgment if you can't pull all historical data
- If YTD pagination hits 750-conversation limit, note it clearly and extrapolate
- All times in your local time zone (per `~/.claude/CLAUDE.md`)

---

If any MCP call fails, note which one and proceed with what is available.

---

## Step 8 — Generate branded .docx

After saving the markdown report, write the metrics JSON and generate the themed document.

**a) Write `data/outputs/intercom-monthly-metrics-[YYYY-MM-DD].json`** — fill every `[placeholder]` from steps 3–6:

```json
{
  "period":     "[e.g. May 2026]",
  "dateRange":  "[e.g. May 1 – May 21, 2026]",
  "generated":  "[e.g. May 21, 2026]",
  "preparedBy": "YOUR NAME",
  "kpis": [
    { "value": "[conv count]",  "label": "Conversations",  "delta": "[MoM delta, e.g. ↓ 38% MoM]" },
    { "value": "[res%]",        "label": "Resolution Rate", "delta": "[delta]", "deltaColor": "9C6B14" },
    { "value": "[median FRT]",  "label": "Median FRT",      "delta": "[delta]" },
    { "value": "[avg close]",   "label": "Avg Close",       "delta": "[delta]", "deltaColor": "2E7D32" }
  ],
  "priorPeriod": "[e.g. April 2026]",
  "summaryTable": [
    ["Conversations",         "[this]", "[prior]", "[delta]"],
    ["Closed",                "[this]", "[prior]", "[delta]"],
    ["Resolution Rate",       "[this]", "[prior]", "[delta]"],
    ["Avg First Response",    "[this]", "[prior]", "[delta]"],
    ["Median First Response", "[this]", "[prior]", "[delta]"],
    ["Avg Close",             "[this]", "[prior]", "[delta]"],
    ["Reopen Rate",           "[this]", "[prior]", "[delta]"],
    ["Fin AI Participation",  "[this]", "[prior]", "[delta]"],
    ["Unique Contacts",       "[this]", "[prior]", "[delta]"],
    ["Unique Domains",        "[this]", "[prior]", "[delta]"]
  ],
  "weeklyTable": [
    ["[e.g. May 1–7]",   "[new]", "[closed]", "[res%]", "[avg FRT]"],
    ["[e.g. May 8–14]",  "[new]", "[closed]", "[res%]", "[avg FRT]"],
    ["[e.g. May 15–21]", "[new]", "[closed]", "[res%]", "[avg FRT]"]
  ],
  "topCustomers": [
    ["1", "[domain]", "[count]"],
    ["2", "[domain]", "[count]"],
    ["3", "[domain]", "[count]"],
    ["4", "[domain]", "[count]"],
    ["5", "[domain]", "[count]"]
  ],
  "openQueue": [
    { "customer": "[name]", "subject": "[subject]", "age": "[e.g. 3d]", "urgent": true }
  ],
  "qtdContext": "[e.g. Q2 2026: 230 conversations (51 days elapsed of ~91)]",
  "ytdContext":  "[e.g. YTD 2026: 572 conversations, 64 domains]",
  "recs": [
    { "num": 1, "title": "[title]", "tag": "[e.g. ACTION]", "tagColor": "B23A2E", "body": "[body text]" }
  ],
  "methodology": {
    "pages":         [pages fetched from Intercom],
    "conversations": [total conversations in the pull],
    "period":        "[full date range of data pulled, e.g. Jan 1 – May 21, 2026]"
  }
}
```

**b) Build the .docx:**
```bash
node reports/intercom-monthly.js data/outputs/intercom-monthly-metrics-[YYYY-MM-DD].json
```
Output: `out/Intercom_Monthly_[YYYY-MM].docx`

**c) PDF, Drive upload, closing prompt** — run **Standard Build & Distribute** from the template.
