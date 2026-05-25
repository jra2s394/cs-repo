---
description: Generate this year's Intercom support intelligence report — YTD snapshot, YoY comparison, all-time totals, and multi-year trend analysis
---

Read `CLAUDE.md` and `prompts/intercom-report-template.md` from this repo before starting.

Generate the **YEARLY** Intercom report for Slabstack CS Intelligence.

---

## Periods

| Period | Definition |
|---|---|
| **Current** | This year: Jan 1 → today |
| **Prior** | Last year: Jan 1 → Dec 31 (full year) OR same YTD period last year |
| **All-time** | Every conversation ever in the Slabstack Intercom workspace |
| **Multi-year trend** | Year-by-year summary for all available years |

---

## Step-by-step instructions

### 1 — Calculate timestamps
```python
from datetime import datetime
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")  # ZoneInfo handles DST automatically
now = datetime.now(MT)
today = now.replace(hour=0, minute=0, second=0, microsecond=0)
current_year = today.year

# This year: Jan 1 → today
ytd_start = today.replace(month=1, day=1)
ytd_label = f"YTD {current_year} (Jan 1 – {today.strftime('%b %-d')})"

# Same YTD window last year (apples-to-apples)
ytd_last_year_start = ytd_start.replace(year=current_year - 1)
ytd_last_year_end = today.replace(year=current_year - 1)  # same month/day, last year

# Full prior years
last_year_start = today.replace(year=current_year - 1, month=1, day=1)
two_years_ago_start = today.replace(year=current_year - 2, month=1, day=1)

# Quarter starts for the current year
quarters = [(f"Q{q+1} {current_year}",
             int(today.replace(month=q * 3 + 1, day=1).timestamp()))
            for q in range(4)]

print(f"YTD_START_TS: {int(ytd_start.timestamp())} | {ytd_label}")
print(f"YTD_LAST_YEAR_START_TS: {int(ytd_last_year_start.timestamp())}")
print(f"YTD_LAST_YEAR_END_TS: {int(ytd_last_year_end.timestamp())}")
print(f"LAST_YEAR_START_TS: {int(last_year_start.timestamp())}")
print(f"TWO_YEARS_AGO_START_TS: {int(two_years_ago_start.timestamp())}")
for label, ts in quarters:
    print(f"  {label}_START_TS: {ts}")
```

### 2 — Pull ALL conversations (no date filter)
This is the one period command that intentionally **does not pass `START_TS`** — the YTD report includes "all-time totals" and the "oldest conversation on record", both of which require the full workspace history:

```
search_conversations(per_page=150)
```

Paginate with `starting_after` until no more pages. This may be 1,000–2,000+ conversations for a mature workspace — that's expected; note the total page count. Do NOT use the generic `search` tool — it returns only `id/title/text/url`. The list-response object shape and Fin/contact field semantics are the same as in the template's **Standard Step 2**.

### 3 — Bucket the results in Python
Split the single all-time pull by each conversation's `created_at`:
- **This year (YTD)** = `created_at >= YTD_START_TS`
- **Last year, same YTD window** = `YTD_LAST_YEAR_START_TS <= created_at < YTD_LAST_YEAR_END_TS`
- **Last year (full)** = `LAST_YEAR_START_TS <= created_at < YTD_START_TS`
- **Two years ago** = `TWO_YEARS_AGO_START_TS <= created_at < LAST_YEAR_START_TS`
- **Current-year quarters** = bucket by the quarter-start timestamps from Step 1
- **All-time** = every conversation in the pull

If two-years-ago data is sparse (< 50 conversations), note it likely reflects Slabstack's early Intercom adoption.

### 4 — Pull currently OPEN conversations
Run **Standard Step 4** from the template.

### 5 — Pull KB articles
Run **Standard Step 5** from the template.

### 6 — Compute all metrics
Apply all formulas from `prompts/intercom-report-template.md`.

Yearly-specific additions:
- Quarter-by-quarter breakdown for the current year
- YoY comparison for every metric (using same-period comparison, not full year vs partial)
- Multi-year trend line (if 2 or more full years of data exist)
- All-time totals: total conversations, total unique contacts, total unique tenants (domains)
- KB growth: articles added per year
- Fin AI adoption curve: participation rate trend by quarter across years
- Top 20 customers all-time by conversation volume
- Top 10 issue categories all-time
- Response time trend by quarter (is the team getting faster or slower over time?)
- Resolution rate trend by quarter

### 7 — Format and save
Period label: `ANNUAL REPORT`
Date range: `[Year] (Jan 1 – [Today Month Day, Year])`

Save to: `data/outputs/intercom-yearly-YYYY.md` (year only, not date)

---

## Yearly-specific additions to the standard format

**Replace the Volume Trend section with:**

```
▌ MULTI-YEAR OVERVIEW

  Year    Conversations   Closed   Resolution%  Avg Response  Fin%   Unique Contacts
  ──────────────────────────────────────────────────────────────────────────────────
  [Y-2]   X,XXX          X,XXX    XX%          X.X min       XX%    XXX
  [Y-1]   X,XXX          X,XXX    XX%          X.X min       XX%    XXX
  [Y]*    X,XXX          X,XXX    XX%          X.X min       XX%    XXX   *YTD
  ──────────────────────────────────────────────────────────────────────────────────
  All-time X,XXX         X,XXX    XX%          X.X min       —      —

  Growth trajectory:  ▲/▼ XX% YoY (conversation volume)
  Service quality:    ▲/▼ XX% YoY (resolution rate)

  ASCII volume trend:
  [Y-2] ████████████████████  X,XXX
  [Y-1] ██████████████████████████  X,XXX
  [Y]*  ████████████████  X,XXX (YTD)


▌ QUARTER-BY-QUARTER ([Current Year])

  Quarter   New    Closed   Resolution%  Avg Response  Avg Close  Fin%   Contacts
  ──────────────────────────────────────────────────────────────────────────────
  Q1        XXX    XXX      XX%          X.X min       X.X hrs    XX%    XX
  Q2*       XXX    XXX      XX%          X.X min       X.X hrs    XX%    XX   *in progress
  Q3        —      —        —            —             —          —      —    *upcoming
  Q4        —      —        —            —             —          —      —    *upcoming
  ──────────────────────────────────────────────────────────────────────────────
  YTD       X,XXX  X,XXX   XX%           X.X min      X.X hrs    XX%    XXX

  Best quarter: [Q label] (lowest avg response / highest resolution rate)
  Worst quarter: [Q label] (flag 🔴 if significantly worse)


▌ ALL-TIME TOTALS  (since Intercom workspace launch)

  Total conversations ever:       X,XXX
  Total conversations closed:     X,XXX
  Overall resolution rate:        XX.X%
  Total unique contacts (users):  XXX
  Total unique tenants (domains): XX
  Total KB articles:              XX (XX published, XX draft)
  Fin AI sessions (available yrs): XX% avg participation

  Oldest conversation on record:  [Date] — [Customer] — [Subject]
  Most active customer all-time:  [Domain] (XX conversations)


▌ TOP 20 CUSTOMERS ALL-TIME

  Rank  Tenant/Domain              Conversations   Still Active?
  ──────────────────────────────────────────────────────────────
  1.    [domain]                   XXX             ✓ / ✗
  2.    [domain]                   XXX             ✓ / ✗
  ...   (complete top 20)


▌ TOP ISSUE CATEGORIES ALL-TIME

  Category                    Count   % of Total   YoY Trend
  ──────────────────────────────────────────────────────────
  [Category 1]                X,XXX   XX%          ▲/▼/—
  [Category 2]                XXX     XX%          ▲/▼/—
  ...   (top 10)


▌ RESPONSE TIME TREND (by quarter)

  Quarter   < 5min   5–30min   30–60min   1–4hr   > 4hr
  ──────────────────────────────────────────────────────
  Q1 [Y-1]  XX%      XX%       XX%        XX%     XX%
  Q2 [Y-1]  XX%      XX%       XX%        XX%     XX%
  [continue for all quarters with data]

  Trend: team is getting ▲ faster / ▼ slower over time


▌ FIN AI ADOPTION CURVE

  Period       Participated   Resolved   Escalated   % of Total Convs
  ──────────────────────────────────────────────────────────────────
  [Q label]    XX             XX         XX          XX%
  [Q label]    XX             XX         XX          XX%
  [continue for all quarters]

  Trajectory: Fin adoption is ▲ growing / ▼ declining / — flat
  Key inflection: [note any quarter with a big jump or drop]


▌ KNOWLEDGE BASE HISTORY

  Year    Articles Published   New This Year   Articles Cited by Fin
  ─────────────────────────────────────────────────────────────────
  [Y-2]   XX                   XX              [Top 3 cited]
  [Y-1]   XX                   XX              [Top 3 cited]
  [Y]*    XX                   XX              [Top 3 cited]

  Stalest article: [Title] — last updated [Date]  [🔴 if > 180 days]
  Most cited ever: [Title] — cited X times across all conversations
```

---

## Accuracy rules
- For YoY comparison, use the same-period YTD window (Jan 1 → same day) — not full year vs partial
- If Slabstack launched Intercom mid-year in any past year, note the partial data and pro-rate where helpful
- All-time totals = sum of all paginated results across all time, not estimates
- Pagination limit note: if all-time total exceeds 1,500 conversations, flag the count and note you paginated through all available data
- All times in your local time zone (per `~/.claude/CLAUDE.md`)

---

If any MCP call fails, note which one and proceed with what is available.

---

## Step 8 — Generate branded .docx

After saving the markdown report, write the metrics JSON and generate the themed document.

**a) Write `data/outputs/intercom-ytd-metrics-[YYYY].json`** — fill every `[placeholder]` from steps 3–6:

```json
{
  "period":     "[e.g. 2026 YTD]",
  "dateRange":  "[e.g. Jan 1 – May 21, 2026]",
  "generated":  "[e.g. May 21, 2026]",
  "preparedBy": "YOUR NAME",
  "kpis": [
    { "value": "[conv YTD]",    "label": "Conversations YTD", "delta": "[YoY delta]" },
    { "value": "[res%]",        "label": "Resolution Rate",   "delta": "[YoY delta]" },
    { "value": "[avg close]",   "label": "Avg Close",         "delta": "[YoY delta]", "deltaColor": "2E7D32" },
    { "value": "[domains]",     "label": "Unique Domains",    "delta": "[YoY delta]" }
  ],
  "multiYearTable": [
    ["[Year]", "[conv]", "[closed]", "[res%]", "[avg FRT]", "[reopen%]", "[contacts]", "[domains]"],
    ["[Year]", "[conv]", "[closed]", "[res%]", "[avg FRT]", "[reopen%]", "[contacts]", "[domains]"],
    ["[Year] YTD*", "[conv]", "[closed]", "[res%]", "[avg FRT]", "[reopen%]", "[contacts]", "[domains]"]
  ],
  "quarterlyTable": [
    ["Q1 [Year]",          "[new]", "[closed]", "[res%]", "[avg FRT]", "[avg close]", "[fin%]"],
    ["Q2 [Year] (partial)","[new]", "[closed]", "[res%]", "[avg FRT]", "[avg close]", "[fin%]"]
  ],
  "allTimeStats": {
    "conversations":     "[all-time count]",
    "closed":            "[all-time closed]",
    "resolutionRate":    "[all-time res%]",
    "contacts":          "[all-time unique contacts]",
    "domains":           "[all-time unique domains]",
    "kbArticles":        "[published count]",
    "finParticipation":  "[all-time fin%]",
    "oldestConversation":"[date — customer — subject]",
    "topCustomerAllTime":"[domain] ([count] conversations)"
  },
  "topCustomers": [
    ["1", "[domain]", "[all-time]", "[YTD]", "Active"],
    ["2", "[domain]", "[all-time]", "[YTD]", "Active"]
  ],
  "finAdoptionTable": [
    ["[Period]", "[sessions]", "[resolved]", "[escalated]", "[% of convs]"]
  ],
  "recs": [
    { "num": 1, "title": "[title]", "tag": "[e.g. OPPORTUNITY]", "tagColor": "007B7F", "body": "[body]" }
  ],
  "methodology": {
    "pages":         [pages fetched],
    "conversations": [total all-time conversations],
    "period":        "[e.g. Jan 1, 2024 – May 21, 2026]"
  }
}
```

**b) Build the .docx:**
```bash
node reports/intercom-yeartodate.js data/outputs/intercom-ytd-metrics-[YYYY].json
```
Output: `out/Intercom_YTD_[YYYY].docx`

**c) PDF, Drive upload, closing prompt** — run **Standard Build & Distribute** from the template.
