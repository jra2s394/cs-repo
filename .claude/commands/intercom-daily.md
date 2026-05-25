---
description: Generate today's Intercom support intelligence report — daily snapshot with yesterday comparison
disable-model-invocation: true
---

Read `CLAUDE.md` and `prompts/intercom-report-template.md` from this repo before starting.

Generate the **DAILY** Intercom report for Slabstack CS Intelligence.

---

## Periods

| Period | Definition |
|---|---|
| **Current** | Today (midnight MDT → now) |
| **Prior** | Yesterday (full day, midnight → midnight MDT) |
| **Running context** | This week Monday → today |

---

## Step-by-step instructions

### 1 — Calculate timestamps
Run this in Bash to get exact Unix timestamps and date strings. `ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md>")` (e.g. `America/Denver`) handles DST automatically — never hardcode the UTC offset.

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")  # ZoneInfo handles DST automatically
now = datetime.now(MT)
today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
yesterday_start = today_start - timedelta(days=1)
yesterday_end = today_start - timedelta(seconds=1)
week_start = today_start - timedelta(days=today_start.weekday())  # Monday

print("TODAY_START_TS:", int(today_start.timestamp()), " | ", today_start.strftime("%Y-%m-%d"))
print("YESTERDAY_START_TS:", int(yesterday_start.timestamp()), " | ", yesterday_start.strftime("%Y-%m-%d"))
print("YESTERDAY_END_TS:", int(yesterday_end.timestamp()))
print("WEEK_START_TS:", int(week_start.timestamp()), " | ", week_start.strftime("%Y-%m-%d"))
print("NOW_TS:", int(now.timestamp()))
```

### 2 — Pull the week's conversations
Run **Standard Step 2** from the template with `START_TS = WEEK_START_TS`. Paginate fully.

### 3 — Bucket the results in Python
Split the single pull from step 2 by each conversation's `created_at`:
- **Today** = `created_at >= TODAY_START_TS`
- **Yesterday** = `YESTERDAY_START_TS <= created_at <= YESTERDAY_END_TS`
- **This week (MTD)** = every conversation from the pull

### 4 — Pull currently OPEN conversations
Run **Standard Step 4** from the template.

### 5 — Pull KB articles
Run **Standard Step 5** from the template.

### 6 — Compute all metrics via Python/Bash
Apply the metric formulas from `prompts/intercom-report-template.md`.

Key daily-specific additions:
- Flag any conversation where `waiting_since` is from YESTERDAY or earlier → 🔴
- Note if any open conversation originated in a prior week → escalation risk
- Highlight the fastest and slowest first-response times for today
- Note if TODAY has 0 conversations (unusual — flag as data gap or slow day)

### 7 — Format and save
Use the exact output format from `prompts/intercom-report-template.md`.

Period label: `DAILY SNAPSHOT`
Date range: `[Today's full date, e.g. Thursday, May 21, 2026]`

Save to: `data/outputs/intercom-daily-YYYY-MM-DD.md`

---

## Daily-specific additions to the standard format

**After the Executive Summary table, add:**

```
▌ TODAY AT A GLANCE

  Conversations opened today:  XX
  Conversations closed today:  XX
  Currently waiting on CS:     XX  [open conversations where last reply was from customer]
  Currently waiting on customer: XX

  Fastest response today:  X min  ([Customer name])
  Slowest response today:  X hrs  ([Customer name])  [🔴 if > 2 hrs]
```

**Add a "This Week So Far" row at the bottom of the Executive Summary table:**
```
│  Week-to-date conversations │ XX           │ [same period last week] │  Δ   │
```

---

## Accuracy rules
- Only include conversations where `created_at >= today_start_ts` for "today" stats
- Do not count yesterday's conversations as today's wins
- If Intercom returns 0 conversations for today, say so — do not estimate
- All times in your local time zone (per `~/.claude/CLAUDE.md`)

---

If any MCP call fails, note which one and proceed with what is available.

---

## Step 8 — Generate branded .docx

After saving the markdown report, write the metrics JSON and generate the themed document.

**a) Write `data/outputs/intercom-daily-metrics-[YYYY-MM-DD].json`** — fill every `[placeholder]` from steps 3–6:

```json
{
  "period":      "[e.g. Thursday, May 21, 2026]",
  "dateRange":   "[e.g. May 21, 2026]",
  "generated":   "[e.g. May 21, 2026]",
  "preparedBy":  "YOUR NAME",
  "dateSlug":    "[e.g. 2026-05-21]",
  "kpis": [
    { "value": "[today count]",  "label": "Today",         "delta": "[vs yesterday]" },
    { "value": "[res%]",         "label": "Resolution",    "delta": "[vs yesterday]" },
    { "value": "[open count]",   "label": "Total Open",    "delta": "[e.g. 🔴 2 urgent]" }
  ],
  "priorPeriod": "[e.g. Yesterday (May 20)]",
  "summaryTable": [
    ["Conversations Today",    "[today]", "[yesterday]", "[delta]"],
    ["Closed Today",           "[today]", "[yesterday]", "[delta]"],
    ["Open (all time)",        "[today]", "[yesterday]", "[delta]"],
    ["Fastest First Response", "[today]", "[yesterday]", "[delta]"],
    ["Slowest First Response", "[today]", "[yesterday]", "[delta]"]
  ],
  "openQueue": [
    { "customer": "[name]", "subject": "[subject]", "age": "[e.g. 3d]", "urgent": true }
  ],
  "weekContext": "[e.g. Week-to-date (Mon–Thu): 18 conversations]",
  "methodology": {
    "pages":         [pages fetched],
    "conversations": [conversations in window],
    "period":        "[e.g. May 19–21, 2026]"
  }
}
```

**b) Build the .docx:**
```bash
node reports/intercom-daily.js data/outputs/intercom-daily-metrics-[YYYY-MM-DD].json
```
Output: `out/Intercom_Daily_[YYYY-MM-DD].docx`

**c) PDF, Drive upload, closing prompt** — run **Standard Build & Distribute** from the template.
