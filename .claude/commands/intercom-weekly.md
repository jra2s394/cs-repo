---
description: Generate this week's Intercom support intelligence report — WoW comparison + MTD context
---

Read `CLAUDE.md` and `prompts/intercom-report-template.md` from this repo before starting.

Generate the **WEEKLY** Intercom report for Slabstack CS Intelligence.

---

## Periods

| Period | Definition |
|---|---|
| **Current** | This week: Monday → today (inclusive) |
| **Prior** | Last week: Monday → Sunday (full 7 days) |
| **MTD context** | Month-to-date total conversations (1st of month → today) |

---

## Step-by-step instructions

### 1 — Calculate timestamps
```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MT = ZoneInfo("America/Denver")  # handles MDT/MST + DST automatically
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)

# This week: Monday → today
this_week_start = today - timedelta(days=today.weekday())  # 0=Mon

# Last week: Mon → Sun
last_week_start = this_week_start - timedelta(days=7)

# MTD: 1st of month → today
mtd_start = today.replace(day=1)

# Earliest start needed for the single conversations pull
earliest = min(last_week_start, mtd_start)

print("THIS_WEEK_START_TS:", int(this_week_start.timestamp()), this_week_start.strftime("%Y-%m-%d"))
print("LAST_WEEK_START_TS:", int(last_week_start.timestamp()), last_week_start.strftime("%Y-%m-%d"))
print("MTD_START_TS:", int(mtd_start.timestamp()), mtd_start.strftime("%Y-%m-%d"))
print("EARLIEST_START_TS:", int(earliest.timestamp()), earliest.strftime("%Y-%m-%d"))
```

### 2 — Pull conversations (one call from the earliest period start)
Use `search_conversations` — it returns the full conversation object (`statistics`, `ai_agent`, `custom_attributes`, `source`, `read`, `waiting_since`) in the list response, so no per-conversation fetch is needed. Make ONE pull from `EARLIEST_START_TS`:
```
search_conversations(created_at={"operator": ">=", "value": EARLIEST_START_TS}, per_page=150)
```
Paginate with `starting_after` until all conversations are retrieved. Do NOT use the generic `search` tool — it returns only `id/title/text/url`.

### 3 — Bucket the results in Python
Split the single pull by each conversation's `created_at`:
- **This week** = `created_at >= THIS_WEEK_START_TS`
- **Last week** = `LAST_WEEK_START_TS <= created_at < THIS_WEEK_START_TS`
- **MTD** = `created_at >= MTD_START_TS`

### 4 — Pull currently OPEN conversations
```
search_conversations(state="open", per_page=150)
```
Paginate with `starting_after` if more than 150 are open.

### 5 — Pull KB articles
```
list_articles(per_page=150)
```

### 6 — Compute metrics
Apply all formulas from `prompts/intercom-report-template.md`.

Weekly-specific additions:
- Day-by-day breakdown of conversation volume for THIS week (Mon–today)
- Compare each day's volume to the same day last week
- Identify peak day (most conversations) and trough (fewest)
- Identify the most active customer (most conversations this week)
- Track which customers opened conversations in BOTH this week and last week (repeat contacts)

### 7 — Format and save
Period label: `WEEKLY REPORT`
Date range: `Mon [M/D] → [Day M/D, Year]`

Save to: `data/outputs/intercom-weekly-YYYY-MM-DD.md` (today's date)

---

## Weekly-specific additions to the standard format

**After Source Channels section, add:**

```
▌ DAY-BY-DAY VOLUME (This Week vs Last Week)

  Day         This Week   Last Week   Δ
  ──────────────────────────────────────
  Monday      XX          XX          ▲/▼
  Tuesday     XX          XX          ▲/▼
  Wednesday   XX          XX          ▲/▼
  Thursday    XX          XX          ▲/▼
  Friday      XX          XX          ▲/▼
  Weekend     XX          XX          ▲/▼  [typically low]
  ──────────────────────────────────────
  Total       XX          XX          ▲/▼X%

  Peak day this week: [Day] (XX conversations)
  Slowest day this week: [Day] (XX conversations)


▌ MOST ACTIVE CUSTOMERS (This Week)

  1. [Name] ([Domain]) — X conversations
  2. [Name] ([Domain]) — X conversations
  [up to 5]

  Returning contacts (opened last week AND this week):
  · [Name] ([issue summary]) — [🔴 if still open, 🟢 if resolved]
```

**Add to Executive Summary table:**
```
│  Month-to-date Conversations │ XX          │ [same MTD last month]  │ Δ    │
```

---

## Accuracy rules
- Week starts Monday — do not use Sunday as week start
- Only count conversations where `created_at` falls within the period
- If today IS Monday, the "this week" period is today only — note this
- Paginate fully — do not estimate weekly totals from partial data
- All times in Mountain Time

---

If any MCP call fails, note which one and proceed with what is available.

---

## Step 8 — Generate branded .docx

After saving the markdown report, write the metrics JSON and generate the themed document.

**a) Write `data/outputs/intercom-weekly-metrics-[YYYY-MM-DD].json`** — fill every `[placeholder]` from steps 3–6:

```json
{
  "period":        "[e.g. Week of May 19, 2026]",
  "dateRange":     "[e.g. Mon May 19 → Thu May 21, 2026]",
  "generated":     "[e.g. May 21, 2026]",
  "preparedBy":    "YOUR NAME",
  "weekStartDate": "[e.g. 2026-05-19]",
  "kpis": [
    { "value": "[this week count]", "label": "This Week",   "delta": "[WoW delta]" },
    { "value": "[res%]",            "label": "Resolution",  "delta": "[WoW delta]" },
    { "value": "[open count]",      "label": "Open",        "delta": "[e.g. 🔴 2 urgent]" }
  ],
  "priorPeriod": "[e.g. Week of May 12]",
  "summaryTable": [
    ["Conversations",  "[this]", "[prior]", "[delta]"],
    ["Closed",         "[this]", "[prior]", "[delta]"],
    ["Resolution Rate","[this]", "[prior]", "[delta]"],
    ["Open",           "[this]", "[prior]", "[delta]"],
    ["Avg FRT",        "[this]", "[prior]", "[delta]"]
  ],
  "dailyTable": [
    ["Monday",    "[this wk]", "[last wk]", "[delta]"],
    ["Tuesday",   "[this wk]", "[last wk]", "[delta]"],
    ["Wednesday", "[this wk]", "[last wk]", "[delta]"],
    ["Thursday",  "[this wk]", "[last wk]", "[delta]"],
    ["Friday",    "[this wk]", "[last wk]", "[delta]"]
  ],
  "topCustomers": [
    ["1", "[domain]", "[count]"],
    ["2", "[domain]", "[count]"]
  ],
  "openQueue": [
    { "customer": "[name]", "subject": "[subject]", "age": "[e.g. 3d]", "urgent": true }
  ],
  "mtdContext": "[e.g. MTD May: 88 conversations (21 days)]",
  "methodology": {
    "pages":         [pages fetched],
    "conversations": [conversations in window],
    "period":        "[e.g. May 12 – May 21, 2026]"
  }
}
```

**b) Build the .docx:**
```bash
node reports/intercom-weekly.js data/outputs/intercom-weekly-metrics-[YYYY-MM-DD].json
```
Output: `out/Intercom_Weekly_[YYYY-MM-DD].docx`

**c) Convert to PDF** *(skip if LibreOffice not installed — the .docx is the primary deliverable)*:
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/Intercom_Weekly_[YYYY-MM-DD].docx
```

---

End with: "Want me to send this to Slack, share it with the team, or tweak anything?"
