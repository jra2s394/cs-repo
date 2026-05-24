---
description: Portfolio health scorecard (or single-customer snapshot if you pass a customer name) — green/yellow/red view from live Asana, Intercom, Shortcut, Gmail, and Calendar data
---

Read `CLAUDE.md` from this repo before starting.

Two modes:
- **Portfolio mode** (no argument) — score every active customer, build a branded `.docx` report
- **Single-customer mode** (`/health-score <customer-name>`) — focused snapshot of one account; inline output only, no `.docx` generated

**Always draft the metrics for review before building any report.** Nothing is created, posted, or sent without explicit approval.

---

## Step 0 — Detect mode

If the user passed a customer name (e.g. `/health-score [CUSTOMER_A]`), enter **single-customer mode**. Otherwise enter **portfolio mode**.

In single-customer mode, every query below scopes to that one customer instead of the full portfolio. Output is an inline scorecard, not a report — skip Step 4 and the Google Drive upload.

---

## Step 1 — Pull live data in parallel

Fetch data simultaneously. Critical gotchas from real-world runs:

### Asana — filter to YOUR team

The Asana workspace likely spans multiple product teams (e.g., Slabstack, [TEAM_OTHER]). An unfiltered `get_projects` returns projects from every team, polluting the scorecard with accounts you don't own.

- Pass `team` to `get_projects` (or `search_objects`) with your team's GID. The [TEAM_PRIMARY] GID is `[ASANA_TEAM_GID]` — confirm in any of your customer-project URLs. For other teams, grep a known project URL for the team segment.
- Filter to non-archived projects with names matching `Onboarding - *`, `Migration - *`, `Integration - *`, `Pilot - *`.

**Portfolio mode:** all customer-facing projects in your team.
**Single-customer mode:** `search_objects(resource_type='project', query='<name>')`, filter to your team. Most customers have 1–2 projects (e.g., main onboarding + an Aggs variant).

### Asana — find overdue tasks the smart way

A naïve `search_tasks(completed=false, due_on_before=<today>)` returns tasks all the way back to 2023 (old template projects). Two filters keep results actionable:

- Set `due_on_after` to ~3 months ago (e.g., `2026-02-01` if today is `2026-05-24`).
- Set `sort_by='due_date'` and `sort_ascending=false` so the most recent overdues come first; the first 100 results then cover the most actionable window (last ~3 weeks).

For portfolio mode, group results client-side by `projects.name`. For single-customer mode, pass `projects_any=<project-GID>` to scope at query time.

### Intercom — search_contacts returns large records; batch contact_ids

Two non-obvious limits caught me on first run:

- `search_contacts(email_domain='[customer_a].com', per_page=25)` returned 25 contacts × ~3KB each → exceeded token budget. Use `per_page=25` and paginate via `pages.next.starting_after`. For each contact, you only need `id` to feed into the conversations query — strip the rest.
- `search_conversations(contact_ids=[...])` caps the array at **15 IDs per call**. Split larger contact lists into batches of 15 and run them in parallel. Aggregate results.

**Portfolio mode shortcut:** call `search_conversations(state='open', per_page=150)` once (workspace-wide open count is usually small — at last check, 3). Group by source author's email domain. Faster than per-customer queries if total open volume is low.

### Shortcut — open stories

Workspace has hundreds of open stories (mostly eng product backlog, not customer-tied). For health scoring:
- **Single-customer mode:** `stories-search(name='<customer>', isDone=false)` — fast and clean.
- **Portfolio mode:** filter to the CSEng team workflow (id `500006272`) for customer-tied work. Count by customer name in story titles. Per-customer searches are accurate but expensive (one query per customer).

### Gmail + Calendar (last-contact signal)

- Gmail: `search_threads(query='<domain> newer_than:30d -in:draft -category:promotions -category:social')` for each customer in single-customer mode. For portfolio mode, this is expensive (one query per customer) — use Asana `modified_at` as a proxy for last activity instead, and only deep-dive Gmail/Calendar for customers that scored yellow/red.
- Calendar: `list_events(fullText='<customer>', startTime=<60d ago>, endTime=<30d ahead>)` for single-customer mode. Skip in portfolio mode for the same reason.

---

## Step 2 — Derive health scores

For each account, compute a health score using this rubric:

| Dimension | 🟢 Green | 🟡 Yellow | 🔴 Red |
|---|---|---|---|
| Last contact | < 14 days | 14–30 days | 30+ days |
| Overdue tasks | 0 | 1–2 | 3+ |
| Open Intercom convos | 0 | 1–2 | 3+ |
| Open Shortcut blockers | 0 | 1 | 2+ |

Assign each account a final health score: 🟢 Green / 🟡 Yellow / 🔴 Red.
Flag any accounts with missing data as 🔴 (data gap is itself a health signal). In portfolio mode, if a dimension is too expensive to compute per-customer (e.g., Calendar), score that dimension 🟡 ("data gap") rather than skipping silently.

---

## Step 3a — Draft the portfolio block (portfolio mode)

Show the full health picture inline before building the report:

```
Portfolio Health — [Date]

Active customers: N · 🟢 X · 🟡 Y · 🔴 Z
Workspace-wide open Intercom convos: M (N of which are in our portfolio)

🔴 RED (Z):
  [Customer]   [CSM]   open:N  overdue:M  | [primary flag]
  ...

🟡 YELLOW (Y):
  [Customer]   [CSM]   open:N  overdue:M  | [primary flag]
  ...

🟢 GREEN (X — only list ones with any signal worth noting):
  [Customer] — N overdue (context)
  All clear: [list of fully-green customer names]
```

Include any at-risk callouts:
```
🔴 [Customer] — [issue description] | Owner: [CSM] | Recommended action: [...]
```

Ask: "Does this look accurate? Any accounts to add, remove, or adjust before I build the report?"

## Step 3b — Draft the single-customer snapshot (single-customer mode)

Skip the portfolio rollup. Instead, present a focused snapshot for the one customer. Pattern (replace placeholders with live data):

```
## [Customer] — Health Snapshot (YYYY-MM-DD)
Overall: 🟢/🟡/🔴  · CSM: [name]  · CS Eng: [name if applicable]
Footprint: N Intercom contacts · M Asana projects · K Shortcut stories

Score by dimension:
  [emoji] Last contact: [evidence]
  [emoji] Overdue tasks: [count + context]
  [emoji] Open Intercom convos: [count]
  [emoji] Open Shortcut blockers: [count]

Asana detail (per project):
  [Project name]: N open, M overdue [+ status notes]
  ...

Customer signals (verbatim from email/Read.ai/Intercom — only quote real triggers, never invent):
  🟢 Expansion: [direct quote]
  🟡 Risk: [direct quote]
  ...

Recommended actions:
  1. [action] (owner, urgency)
  ...
```

End by asking: "Does this match your read? Want me to close any data gaps, or just stop here?" Do **not** build a `.docx` — single-customer mode is inline only.

---

## Step 4 — Build the report (portfolio mode only, after approval)

Skip this step entirely in single-customer mode.

Once approved:

**a) Write the metrics JSON** to `data/outputs/customer-health-metrics-[YYYY-MM-DD].json`:

```json
{
  "generated":  "[e.g. May 26, 2026]",
  "period":     "[e.g. May 2026]",
  "dateRange":  "[e.g. May 1–26, 2026]",
  "preparedBy": "[Your Name from CLAUDE.md]",
  "kpis": [
    { "value": "[X]",    "label": "Active Accounts",  "delta": null },
    { "value": "[Y]",    "label": "At Risk",           "delta": "[e.g. 🔴 2 Critical]" },
    { "value": "[Z%]",   "label": "On-Track Rate",     "delta": "[e.g. +5% vs last month]" },
    { "value": "[🟢/🟡/🔴]", "label": "Portfolio Health", "delta": null }
  ],
  "summary": [
    ["🟢 Green",  "[count]", "[X%]"],
    ["🟡 Yellow", "[count]", "[X%]"],
    ["🔴 Red",    "[count]", "[X%]"]
  ],
  "accounts": [
    {
      "customer":    "[name]",
      "csm":         "[name]",
      "healthScore": "🟢 Green",
      "lastContact": "May 20, 2026",
      "openIssues":  0,
      "tasksOverdue": 0
    }
  ],
  "atRisk": [
    {
      "customer": "[name]",
      "issue":    "[description]",
      "owner":    "[CSM name]",
      "action":   "[recommended next step]",
      "critical": true
    }
  ],
  "upcomingRenewals": [
    { "customer": "[name]", "renewalDate": "[date]", "daysOut": 60, "arr": "$12,000", "risk": "Medium" }
  ],
  "recs": [
    { "label": "[title]", "body": "[recommendation text]" }
  ],
  "methodology": {
    "sources": ["Asana", "Intercom", "Gmail", "Google Calendar", "Shortcut"]
  }
}
```

**b) Build the .docx:**
```bash
node reports/customer-health.js data/outputs/customer-health-metrics-[YYYY-MM-DD].json
```
Output: `out/Customer_Health_[Date].docx`
Auto-copies to `~/Desktop/CS Reports/Health Reports/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it).

---

## Google Drive upload (portfolio mode only, optional)

After generating the report, ask: "Want me to upload the health data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "Portfolio Health — [Period]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

## Rules

- Health scores must come from live tool data — never estimated
- Every 🔴 account gets a named recommended action
- Flag missing data accounts as 🔴 (data gap is a risk)
- Customer signals (expansion language, churn language, competitor mentions) must be direct quotes from email/Intercom/Read.ai — never paraphrase, never invent
- All times in Mountain Time
- If any MCP tool is unavailable, note it and continue with what you have
- Single-customer mode is inline only — never build a `.docx` for one account (use `/qbr` for that flow)
