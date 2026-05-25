# Intercom Report Template — Slabstack CS Intelligence

> Shared format specification for all `/intercom` reporting commands.
> Each command references this file and supplies its own period parameters.

---

## Report Philosophy

These reports exist to give you and executive stakeholders an **accurate, data-sourced view** of Slabstack's support health. Every number must come from a live Intercom API call — no estimates, no round numbers invented for aesthetics.

**Accuracy rules (CLAUDE.md apply here too):**
- 🔴 = critical / blocker / urgent open conversation
- 🟡 = watch item / slow-moving / aging conversation
- 🟢 = resolved / healthy trend
- Flag any metric that could not be confirmed from live data
- Never claim Fin resolved something without `ai_agent_participated: true` and a `resolution_state` to match

---

## Data Collection Protocol

### Step 1 — Calculate Unix timestamps
Use Python (via Bash) to compute the exact Mountain Time midnight boundaries for the current and prior periods. Output both as Unix timestamps and human-readable strings. `ZoneInfo("America/Denver")` handles the MDT/MST switch automatically — never hardcode the UTC offset.

```python
from datetime import datetime
from zoneinfo import ZoneInfo

MT = ZoneInfo("America/Denver")  # handles MDT/MST + DST automatically

# Example: compute start of today in Mountain Time
today_start = datetime.now(MT).replace(hour=0, minute=0, second=0, microsecond=0)
today_start_ts = int(today_start.timestamp())
```

### Step 2 — Pull conversations for the CURRENT period
Use the `search_conversations` tool. It returns the full conversation object — `statistics`, `ai_agent`, `custom_attributes`, `source`, `read`, `waiting_since` — in the list response, so no per-conversation fetch is needed. Filter by the Unix timestamp from Step 1:
```
search_conversations(created_at={"operator": ">=", "value": CURRENT_START_TS}, per_page=150)
```
Do NOT use the generic `search` tool for conversations — it returns only `id/title/text/url`, which would force a `fetch` per conversation (infeasible at weekly/monthly/yearly volume).

**If the period has >150 conversations**, paginate using `starting_after` until you have all conversations for the period. Note the total count.

If the current and prior periods are adjacent (e.g. yesterday vs. today), make a single pull from the earlier start timestamp and bucket by `created_at` in Python — fewer API calls.

### Step 3 — Pull conversations for the PRIOR period
Repeat Step 2 with the prior period's start timestamp for WoW / MoM / QoQ comparison — unless a single adjacent-period pull (above) already covered it.

### Step 4 — Pull currently open conversations
```
search_conversations(state="open", per_page=150)
```
This always returns the real-time open queue regardless of date filter. Paginate with `starting_after` if more than 150 conversations are open.

### Step 5 — Pull KB articles
```
list_articles(per_page=150)
```
Count published vs draft; identify recently updated (within 30 days); note which articles Fin cited in the period's conversations.

### Step 6 — Compute metrics
Run all calculations in Python via Bash. Required metrics:

**Volume**
- `new_conversations` = total conversations created in current period
- `closed_conversations` = conversations where `state == "closed"` in current period
- `resolution_rate` = closed / new × 100
- `open_snapshot` = currently open count (real-time)
- `snoozed` = currently snoozed count

**Speed**
- `avg_first_response_sec` = mean of `statistics.time_to_admin_reply` (exclude nulls)
- `median_first_response_sec` = median of same
- `avg_resolution_sec` = mean of `statistics.time_to_first_close` (exclude nulls)
- `avg_parts` = mean of `statistics.count_conversation_parts`

**Quality**
- `total_reopens` = sum of `statistics.count_reopens`
- `reopen_rate` = total_reopens / closed_conversations × 100
- `pct_read` = conversations where `read == true` / total

**AI / Fin**
- `fin_participated` = count of `ai_agent_participated == true`
- `fin_rate` = fin_participated / new_conversations × 100
- `fin_resolution_states` = breakdown of `ai_agent.resolution_state` values: `assumed_resolution`, `escalated`, `resolved`
- `fin_articles_cited` = list of article titles + cite count from `ai_agent.content_sources`

**People**
- `unique_contacts` = count of distinct contact IDs across all conversations in period
- `unique_domains` = count of distinct email domains (proxy for tenant count)
- Derive domain from contact `source.author.email` field

**Issue categories**
- Use `custom_attributes.AI Title` as the primary category signal
- Fall back to `custom_attributes.Issue Type` if AI Title is missing
- Group and rank by frequency

**Channel**
- Group by `source.delivered_as` and `source.type`

**Response time distribution**
- Bucket `time_to_admin_reply` into: <5 min, 5–30 min, 30–60 min, 1–4 hr, >4 hr

**Trend delta formatting**
- Use `▲` for improvement (faster response, higher resolution rate, fewer reopens)
- Use `▼` for degradation
- Show absolute value + percentage change
- Note if prior period had 0 data (no comparison possible)

---

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLABSTACK  ·  INTERCOM SUPPORT INTELLIGENCE
[PERIOD LABEL]  ·  [DATE RANGE]
Generated [DATE] [TIME] MT  ·  [X] conversations analyzed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ EXECUTIVE SUMMARY

┌─────────────────────────────────────────────────────────────────┐
│  Metric                   │ This Period  │ Prior Period │  Δ    │
├───────────────────────────┼──────────────┼──────────────┼───────┤
│  New Conversations        │ XX           │ XX           │ ▲/▼X% │
│  Closed                   │ XX           │ XX           │ ▲/▼X% │
│  Resolution Rate          │ XX.X%        │ XX.X%        │ ▲/▼Xpt│
│  Open (current snapshot)  │ XX           │ —            │ —     │
│  Avg First Response       │ X.X min      │ X.X min      │ ▲/▼X% │
│  Median First Response    │ X.X min      │ X.X min      │ ▲/▼X% │
│  Avg Time to Close        │ X.X hrs      │ X.X hrs      │ ▲/▼X% │
│  Reopen Rate              │ X.X%         │ X.X%         │ ▲/▼Xpt│
│  Fin AI Participation     │ XX%          │ XX%          │ ▲/▼Xpt│
│  Unique Contacts (Users)  │ XX           │ XX           │ ▲/▼X% │
│  Unique Tenants (Domains) │ XX           │ XX           │ ▲/▼X% │
└─────────────────────────────────────────────────────────────────┘

[For weekly/monthly/quarterly/yearly only — add cumulative rows:]
│  All-Time Conversations   │ X,XXX        │ —            │ —     │
│  KB Articles (published)  │ XX           │ —            │ —     │


▌ OPEN QUEUE  ([X] conversations)

[For each open conversation, one block:]
[COLOR_INDICATOR]  [Customer Name] ([Company/Domain]) — "[AI Title or subject excerpt]"
   Opened: [Date]  ·  Waiting since: [Date or "resolved"]  ·  Parts: [X]
   Assigned: [Admin ID or "unassigned"]  ·  Fin: [participated/not]
   URL: https://app.intercom.com/a/inbox/_/inbox/conversation/[ID]

[Sort: 🔴 longest waiting first, then 🟡, then 🟢]
[Flag 🔴 if waiting_since > 24h, 🟡 if 4–24h, 🟢 if < 4h or CS replied last]


▌ TOP ISSUE CATEGORIES  ([X] classified)

  Rank  Category                   Count   Share   Trend
  ─────────────────────────────────────────────────────
  1.    [Category]                 XX      XX%     ▲/▼/—
  2.    [Category]                 XX      XX%     ▲/▼/—
  ...   (show top 10 or all if fewer)

[Trend = vs prior period, if computable]


▌ SOURCE CHANNELS

  [channel_type]: XX conversations (XX%)
  ...


▌ FIN AI AGENT

  Participated in:  XX of XX conversations (XX%)
  Resolution outcomes:
    Assumed Resolution: XX  (XX% of Fin-touched)
    Escalated to Human: XX  (XX%)
    Resolved by Fin:    XX  (XX%)
    Unknown/Other:      XX  (XX%)

  Top articles cited by Fin this period:
    1. "[Article Title]"  —  cited in X conversations
    2. "[Article Title]"  —  cited in X conversations
    [up to 5]

  [If Fin rate < 10%: 🟡 Fin participation is low — check workflow triggers]
  [If escalation rate > 50%: 🟡 High escalation rate — review Fin content coverage]


▌ KNOWLEDGE BASE  (help.slabstack.com)

  Published articles:  XX
  Draft articles:      XX
  Total:               XX

  Recently updated (last 30 days):
    · [Article Title]  —  updated [Date]
    · [Article Title]  —  updated [Date]

  Most cited by Fin this period:
    · [Article Title]  — cited X times
    · [Article Title]  — cited X times

  [Flag 🟡 if any article hasn't been updated in >90 days and was cited by Fin]


▌ RESPONSE TIME DISTRIBUTION  (first response)

  < 5 min     ████████████  XX%  (XX conversations)
  5–30 min    ████████      XX%
  30–60 min   ████          XX%
  1–4 hrs     ██            XX%
  > 4 hrs     █             XX%  [🔴 flag if > 15%]


▌ CONVERSATION VOLUME TREND

  [For daily: show last 7 days as a bar chart by day]
  [For weekly: show last 4 weeks bar chart]
  [For monthly: show last 6 months bar chart]
  [For quarterly: show last 4 quarters]
  [For yearly: show all available years]

  Use ASCII bars: █ = 5 conversations (scale to data)


▌ FLAGS & RECOMMENDATIONS

  🔴  [List any critical items — open >24h, high escalation rate, etc.]
  🟡  [Watch items — trends to monitor, gaps in coverage]
  🟢  [Positive trends worth calling out]

  [Minimum 2 bullets per category; use 🟢 — if genuinely nothing to flag]


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data sourced live from Intercom via MCP · Slabstack CS Ops
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Output Save Location

Save completed report to:
```
data/outputs/intercom-[type]-[YYYY-MM-DD].md
```
Where `[type]` is: `daily`, `weekly`, `monthly`, `quarterly`, or `yearly`.

Then show the report inline and ask:
> "Want me to send this to Slack, share it with the team, or tweak anything?"

---

## Known Intercom Limitations (flag these in the report if relevant)

- **Companies not configured** — tenant count is estimated from unique email domains
- **CSAT** — Intercom conversation ratings are rarely populated in Slabstack's workspace; omit CSAT section if < 5 ratings exist in the period
- **Article view counts** — not available via Intercom API; omit per-article view stats
- **Admin name mapping** — admin IDs from API should be labeled using the table in CLAUDE.md; otherwise show ID only
- **Pagination** — for periods with > 750 conversations, note the sample size and flag if results are partial
- **Fin / ai_agent fields** — the `ai_agent` object is `null` unless Fin participated; `resolution_state` and `content_sources` exist only on Fin-touched conversations. Verify those sub-field names against a real Fin conversation before relying on the Fin section.

---

## Standard Protocol Reference

The per-period commands (`/intercom-daily`, `/intercom-weekly`, `/intercom-monthly`, `/intercom-quarterly`, `/intercom-yeartodate`) invoke the following named steps. Each command's `.md` says "run **Standard Step 2** from the template" instead of inlining the same paragraph five times.

### Standard Step 2 — Pull conversations for a period

Use `search_conversations` — it returns the full conversation object (`statistics`, `ai_agent`, `custom_attributes`, `source`, `read`, `waiting_since`) in the list response, so no per-conversation fetch is needed. Make ONE pull from the period's earliest start timestamp:

```
search_conversations(created_at={"operator": ">=", "value": START_TS}, per_page=150)
```

Do NOT use the generic `search` tool — it returns only `id/title/text/url`, which forces a `fetch` per conversation (infeasible at weekly volume and up). Paginate with `starting_after` until all conversations are retrieved.

### Standard Step 4 — Pull currently OPEN conversations

```
search_conversations(state="open", per_page=150)
```

This is the live open queue regardless of date filter. Paginate with `starting_after` if more than 150 conversations are open.

### Standard Step 5 — Pull KB articles

```
list_articles(per_page=150)
```

Count published vs draft; identify recently updated (within 30 days); note which articles Fin cited in the period's conversations.

### Standard Build & Distribute

After writing the metrics JSON and running the per-period build script (`node reports/intercom-<period>.js ...`), do the following three steps in order:

**1. PDF conversion** *(skip if LibreOffice not installed — the .docx is the primary deliverable)*:
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/<DocxFilename>.docx
```

**2. Google Drive upload (optional).** After showing the report, ask: "Want me to upload the data to Google Sheets?" If yes:

1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: `"Intercom <Period Type> — <Period Label>"`
   - `textContent`: the CSV file contents
   - `contentMimeType`: `"text/csv"`
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

**3. Closing prompt.** End the command with the line:

> "Want me to upload the data to Google Sheets, post this to Slack, or tweak anything?"
