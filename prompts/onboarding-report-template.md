# Onboarding Report Template — Slabstack CS Intelligence

> Shared format specification for all `/onboarding` reporting commands.
> Each command references this file and supplies its own period parameters.

---

## Report Philosophy

These reports give the CS team and leadership an accurate, data-sourced view of the onboarding pipeline — measured in CARR, not just account counts. Every number must come from the uploaded mastersheet or a live Asana API call. No estimates.

**Accuracy rules:**
- 🔴 = blocked / at-risk / CARR in danger
- 🟡 = watch item / slow-moving / overdue task
- 🟢 = completed / on track
- Flag any metric that could not be confirmed from the data source
- Never claim a go-live happened without a date or status in the mastersheet confirming it
- If a field is missing from the sheet, note it — don't invent it

---

## Data Sources

### Primary: Finance Mastersheet
The user uploads an Excel or CSV file from finance. It contains onboarding transactions with CARR by customer and project. Column names vary — see mapping guide below.

### Secondary: Asana
Pull onboarding-related tasks via MCP to show task health alongside CARR metrics. Use `get_my_tasks` and search for tasks linked to customers in the mastersheet.

---

## Step 1 — Read and Inspect the Mastersheet

Ask the user for the file path if not already provided. Then inspect headers:

```python
import sys, json

path = "/path/to/mastersheet.xlsx"  # or .csv

if path.lower().endswith('.csv'):
    import csv
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    headers = list(rows[0].keys()) if rows else []
else:
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.active
    raw_headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(raw_headers)]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if any(v is not None for v in row):
            rows.append(dict(zip(headers, row)))
    wb.close()

print("Headers:", headers)
print(f"Row count: {len(rows)}")
print("Sample (first 3 rows):", json.dumps(rows[:3], default=str, indent=2))
```

Review the output before proceeding. Flag any headers that are ambiguous.

---

## Step 2 — Map Columns to Standard Schema

After inspecting headers, identify which columns map to each standard field. Use fuzzy matching — column names from finance are rarely exact.

| Standard Field   | Look for (case-insensitive, partial match OK)                            |
|------------------|--------------------------------------------------------------------------|
| `customer`       | customer, client, account, company, name                                 |
| `project`        | project, product, module, implementation, type                           |
| `carr`           | CARR, ARR, MRR, revenue, value, ACV, contract                           |
| `status`         | status, stage, phase, state                                              |
| `start_date`     | start, kickoff, begin, contract date, signed                             |
| `go_live_date`   | go-live, golive, live date, launch, complete, completion                 |
| `csm`            | CSM, owner, assigned, rep, manager, success                              |
| `notes`          | notes, comments, blockers, flags                                         |

If a field is not found, set it to `None` and omit the corresponding column in the report — do not guess.

```python
# Example mapping (adjust col names to what you actually found)
def map_row(row):
    return {
        "customer":      row.get("Customer Name") or row.get("Client") or row.get("Account") or "—",
        "project":       row.get("Project") or row.get("Product") or "—",
        "carr":          row.get("CARR") or row.get("ARR") or row.get("Contract Value") or None,
        "status":        row.get("Status") or row.get("Stage") or "—",
        "start_date":    row.get("Start Date") or row.get("Kickoff Date") or None,
        "go_live_date":  row.get("Go Live Date") or row.get("Live Date") or None,
        "csm":           row.get("CSM") or row.get("Owner") or "—",
        "notes":         row.get("Notes") or row.get("Blockers") or "",
    }

records = [map_row(r) for r in rows]
```

---

## Step 2.5 — Separate Backlog Rows

Before any period filtering or status normalization, identify and separate backlog rows. Backlog items represent features not yet ready from product/engineering — they must never appear in pipeline metrics.

```python
def is_backlog(row):
    # Item column starts with "Backlog Subscription -" or "Backlog "
    item_val = str(row.get("Item") or row.get("Project") or "").strip()
    return item_val.lower().startswith("backlog")

backlog_rows = [r for r in rows if is_backlog(r)]
main_rows    = [r for r in rows if not is_backlog(r)]

# All further processing uses only main_rows
rows = main_rows
records = [map_row(r) for r in rows]

# Build backlog records (CARR only — no status/date needed)
backlog_records = []
for r in backlog_rows:
    rec = map_row(r)
    rec["carr_float"] = parse_carr(rec["carr"])
    rec["carr_fmt"]   = fmt_carr(rec["carr_float"])
    backlog_records.append(rec)

carr_backlog = sum(r["carr_float"] for r in backlog_records if r["carr_float"])
backlog_table = [
    [r["customer"], r["project"] or r["carr_fmt"], r["carr_fmt"]]
    for r in backlog_records
]

print(f"Backlog rows separated: {len(backlog_rows)} rows, {fmt_carr(carr_backlog)} CARR")
print(f"Main pipeline rows: {len(rows)}")
```

Include `backlogTable` and `carrBacklog` in the metrics JSON. If there are no backlog rows, set both to `[]` and `"—"` respectively.

---

## Step 3 — Normalize CARR Values

Finance may store CARR as strings ("$18,500"), numbers (18500), or mixed. Normalize to floats for computation, then format as strings for display.

```python
import re

def parse_carr(val):
    if val is None:
        return None
    s = str(val).replace(",", "").replace("$", "").strip()
    try:
        return float(s)
    except ValueError:
        return None

def fmt_carr(val):
    if val is None:
        return "—"
    if val >= 1_000_000:
        return f"${val/1_000_000:.1f}M"
    if val >= 1_000:
        return f"${val/1_000:.1f}k"
    return f"${val:,.0f}"

for r in records:
    r["carr_float"] = parse_carr(r["carr"])
    r["carr_fmt"]   = fmt_carr(r["carr_float"])
```

---

## Step 4 — Normalize Status Values

Map finance/ops status vocabulary to the four standard values used across all reports:

| Standard Status | Map from (case-insensitive)                                              |
|-----------------|--------------------------------------------------------------------------|
| `In-Flight`     | active, in progress, onboarding, ongoing, started, in flight             |
| `Completed`     | complete, completed, live, go-live, done, finished, launched             |
| `At-Risk`       | at-risk, at risk, delayed, behind, slow, stalled, watch                  |
| `Blocked`       | blocked, on hold, paused, stopped, escalated                             |
| `Not Started`   | not started, pending, scheduled, upcoming, queued                        |

```python
STATUS_MAP = {
    "active": "In-Flight", "in progress": "In-Flight", "onboarding": "In-Flight",
    "ongoing": "In-Flight", "started": "In-Flight", "in flight": "In-Flight",
    "complete": "Completed", "completed": "Completed", "live": "Completed",
    "go-live": "Completed", "done": "Completed", "finished": "Completed", "launched": "Completed",
    "at-risk": "At-Risk", "at risk": "At-Risk", "delayed": "At-Risk",
    "behind": "At-Risk", "stalled": "At-Risk", "watch": "At-Risk",
    "blocked": "Blocked", "on hold": "Blocked", "paused": "Blocked",
    "not started": "Not Started", "pending": "Not Started", "scheduled": "Not Started",
}

def normalize_status(raw):
    if not raw or raw == "—":
        return "—"
    return STATUS_MAP.get(str(raw).strip().lower(), str(raw).strip())
```

---

## Step 5 — Style Status Cells for the Report

Use cell styling from report-theme.js to color-code status in tables. In the JSON, pass styled cell objects:

```python
STATUS_STYLE = {
    "In-Flight":   {"fill": "E4F1F1", "color": "007B7F", "bold": True},   # teal
    "Completed":   {"fill": "E9F2E9", "color": "2E7D32", "bold": True},   # green
    "At-Risk":     {"fill": "FAF0DA", "color": "9C6B14", "bold": True},   # amber
    "Blocked":     {"fill": "FAF0DA", "color": "B23A2E", "bold": True},   # red
    "Not Started": {"fill": "F1F3F6", "color": "59626F", "bold": False},  # gray
}

def status_cell(status_str):
    style = STATUS_STYLE.get(status_str, {})
    return {"text": status_str, **style}
```

---

## Step 6 — Pull Asana Data

Pull onboarding-related tasks to show task health alongside CARR metrics.

```
1. get_my_tasks (filter: incomplete=true) — get all open tasks assigned to me
2. search_tasks("onboarding") — find onboarding-tagged tasks
3. For each customer in the mastersheet, optionally search_tasks(customer_name)
   to find customer-specific tasks — limit to top 5 customers by CARR
```

Compute:
- `tasks_due_this_period`: tasks with due date in the report window
- `tasks_complete`: tasks marked complete in the report window
- `tasks_overdue`: tasks with due date before today, still incomplete
- `tasks_open`: total open onboarding tasks

Build `asanaTable` rows grouped by category (e.g., "Onboarding tasks", "Go-live prep", "Customer-specific"):

```python
asana_table = [
    ["Onboarding tasks (total)", str(tasks_complete), str(tasks_open), str(tasks_overdue)],
    # Add per-customer rows for at-risk accounts if available
]
```

If Asana pulls fail, note it in the methodology and omit the Asana section — do not fabricate task counts.

---

## Step 7 — Compute Period Metrics

### CARR aggregates
```python
# By status
carr_completed   = sum(r["carr_float"] for r in records if r["status_norm"] == "Completed" and in_period(r))
carr_in_flight   = sum(r["carr_float"] for r in records if r["status_norm"] == "In-Flight")
carr_at_risk     = sum(r["carr_float"] for r in records if r["status_norm"] in ("At-Risk", "Blocked"))
carr_not_started = sum(r["carr_float"] for r in records if r["status_norm"] == "Not Started")
total_pipeline   = sum(r["carr_float"] for r in records if r["carr_float"] is not None)

# Period-specific
accounts_started   = len([r for r in records if r["status_norm"] != "Not Started" and started_in_period(r)])
accounts_completed = len([r for r in records if r["status_norm"] == "Completed" and completed_in_period(r)])
accounts_in_flight = len([r for r in records if r["status_norm"] == "In-Flight"])
```

### Days to go-live (if dates available)
```python
def days_to_go_live(r):
    if r["start_date"] and r["go_live_date"]:
        delta = r["go_live_date"] - r["start_date"]
        return delta.days
    return None

days_list = [days_to_go_live(r) for r in records if days_to_go_live(r) is not None]
avg_days  = round(sum(days_list) / len(days_list)) if days_list else None
```

### WoW / MoM / QoQ delta formatting
```python
def delta_str(current, prior):
    if prior is None or prior == 0:
        return "—"
    pct = (current - prior) / prior * 100
    arrow = "▲" if pct >= 0 else "▼"
    return f"{arrow} {abs(pct):.0f}%"
```

---

## Step 8 — Build the Metrics JSON

See each command file for the exact JSON schema. Common rules:
- All CARR values in the JSON should be formatted strings (e.g., "$18.5k"), not raw floats
- All dates as human-readable strings ("May 26, 2026"), not ISO timestamps
- `methodology.rowsProcessed` = total rows read from the mastersheet (including headers excluded)
- `methodology.asanaTasks` = total Asana tasks pulled (0 if Asana was unavailable)
- `backlogTable` = array of `[customer, project, carr_fmt]` rows (empty array `[]` if none)
- `carrBacklog` = formatted CARR total for backlog rows (e.g., `"$81.4k"`), or `"—"` if none

---

## Step 9 — Run the Report Generator

```bash
node reports/onboarding-[period].js data/outputs/onboarding-[period]-metrics-YYYY-MM-DD.json
```

Output: `out/Onboarding_[Period]_YYYY[-QN|-MM].docx`

Convert to PDF if LibreOffice is installed (optional):
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/Onboarding_[Period]_YYYY.docx
```

---

## Accuracy Rules

- Never claim an account is "Completed" without a status or go-live date in the sheet confirming it
- If CARR is missing for a row, include the account in counts but mark CARR as "—" — do not skip the account
- Period filtering: if no date columns exist, report on ALL accounts by current status (note this clearly)
- If prior-period data isn't available for WoW/MoM/QoQ comparison, use "—" — do not invent it
- Flag 🔴 any account where status = "Blocked" and CARR > $10k
- All times in your local time zone (per `~/.claude/CLAUDE.md`)

---

## Known Limitations

- **No date columns**: if the sheet has no start/go-live dates, time-period filtering is impossible — report on current status snapshot only and note the limitation
- **Prior-period comparison**: WoW/MoM/QoQ deltas require either (a) a prior snapshot on file or (b) date columns to bucket historical data; flag if unavailable
- **Multi-year**: yearly reports can only show prior years if historical mastersheet data is available
- **Asana matching**: linking Asana tasks to mastersheet accounts depends on customer names matching — flag any accounts with no Asana tasks found

---

## Standard Protocol Reference

The per-period commands (`/onboarding-weekly`, `/onboarding-monthly`, `/onboarding-quarterly`, `/onboarding-yearly`) all finish with the same build-and-distribute trio. Each command says "run **Standard Build & Distribute** from the template" instead of inlining the same 20 lines four times.

### Standard Build & Distribute

After writing the metrics JSON via the per-period build script (`node reports/onboarding-<period>.js ...`), do the following three steps in order.

> The build script auto-copies the .docx to `~/Desktop/CS Reports/Onboarding/` via `lib/copy-to-desktop.js` when that folder exists (run `bash scripts/setup-desktop.sh` once to create it). No extra step needed — just confirm the "→ Desktop copy" line printed.

**1. PDF conversion** *(skip if LibreOffice not installed — the .docx is the primary deliverable)*:
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless --convert-to pdf --outdir out/ out/<DocxFilename>.docx
```

**2. Google Drive upload (optional).** After showing the report, ask: "Want me to upload the data to Google Sheets?" If yes:

1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: `"Onboarding <Period Type> — <Period Label>"`
   - `textContent`: the CSV file contents
   - `contentMimeType`: `"text/csv"`
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

**3. Closing prompt.** End the command with the line:

> "Want me to upload the data to Google Sheets, share this in Slack, or tweak anything?"
