# Portfolio Health Score — Prompt Template

Use this template when running `/health-score`. Claude follows these instructions to pull live data, derive health scores, and build the report.

---

## Data Pull Sequence

1. Pull Asana tasks for all CS projects — sort by project (each = one customer account)
2. Pull Intercom open conversations — group by customer domain
3. Pull Shortcut open stories — filter by customer name tags
4. Pull Gmail threads — check last sent/received date per customer domain
5. Pull Google Calendar — last meeting and next scheduled meeting per customer

## Health Score Rubric

| Dimension | 🟢 Green (0 pts) | 🟡 Yellow (1 pt) | 🔴 Red (2 pts) |
|---|---|---|---|
| Last contact | < 14 days | 14–30 days | 30+ days |
| Overdue tasks | 0 | 1–2 | 3+ |
| Open Intercom convos | 0 | 1–2 | 3+ |
| Open Shortcut blockers | 0 | 1 | 2+ |

**Final score:** 0 = Green · 1–3 = Yellow · 4+ = Red
**Missing data** = automatically 🔴 (data gap is a risk signal)

## Output Accuracy Rules

- Every health score must cite its source data points
- Never assign 🟢 Green without confirming all four dimensions
- If a dimension can't be checked (tool unavailable), default to 🟡 and note the gap
- Account count must match what's pulled from Asana, not what's in the customer master

## JSON Output

The metrics JSON should include:
- `accounts[]` with one entry per active onboarding or CS account
- `atRisk[]` with specific issue and recommended action per 🔴 account
- `upcomingRenewals[]` for any renewal within 90 days (pull dates from Gmail if known)
- `kpis[]` with 4 KPI cards: Active Accounts, At Risk, On-Track Rate, Portfolio Health

## Narrative Style

- Health summary: "X accounts green, Y yellow, Z red — portfolio is [🟢 healthy / 🟡 mixed / 🔴 elevated risk]."
- At-risk callout: name the customer, name the issue, name the recommended action — never vague
- Renewal radar: include only if renewal is within 90 days with a known date
