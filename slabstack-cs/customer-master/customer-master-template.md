# Customer Master — Template

This file defines the canonical schema for the master customer tracker. The actual tracker lives in `customer-master.xlsx` (gitignored, since it contains customer-identifying data). Use this template to spin up a new spreadsheet that conforms to the schema the rest of the repo expects.

---

## Why this template exists

`.xlsx`, `.csv`, and other data files are excluded from git on purpose — they contain customer ARR, contact info, and renewal data that should never be committed to a public repo. But the *schema* needs to live somewhere everyone can read. That's this file.

---

## Required Sheets

The xlsx workbook should contain at least two sheets:

| Sheet | Purpose |
|---|---|
| `Customers` | One row per customer — the columns below |
| `Activity Log` | Optional — append-only log of QBRs, health changes, escalations |

---

## Required Columns — `Customers` Sheet

| Column | Type | Required | Notes |
|---|---|---|---|
| `Customer Name` | text | yes | Legal company name |
| `ARR` | number | yes | Annual recurring revenue, USD |
| `MRR` | number | no | Derived from ARR if not set |
| `Contract Start` | date | yes | YYYY-MM-DD |
| `Renewal Date` | date | yes | YYYY-MM-DD; drives `/renewal-health` and renewal reports |
| `Contract Length` | enum | yes | 12 / 24 / 36 (months) |
| `CSM Owner` | text | yes | Full name; must match a name in `CLAUDE.md` "Key People" |
| `Health Score` | enum | yes | `green` / `yellow` / `red` |
| `Plan` | text | yes | Tier or plan name |
| `Integration` | text | no | `Sysdyne`, `None`, or other; drives integration-specific reports |
| `Last QBR` | date | no | YYYY-MM-DD; flags overdue QBRs in `/qbr` prep |
| `Notes` | text | no | Free text — risk flags, key context, recent escalations |

---

## Recommended Optional Columns

These aren't required by any command, but adding them now is cheap and they unlock future analysis:

| Column | Use |
|---|---|
| `Primary Contact` | Name of the main customer-side contact |
| `Primary Contact Email` | For inbox cross-referencing |
| `Industry Segment` | Residential / Commercial / Infrastructure / Mixed |
| `Region` | State or sales region |
| `Onboarding Complete Date` | When onboarding officially closed; feeds `/end-onboarding` audits |
| `Expansion Signal` | Yes/No flag from `/expansion`; refresh quarterly |

---

## Health Score Definitions

| Score | Definition | Action |
|---|---|---|
| 🟢 green | Engaged, using product, low churn risk | Monitor; QBR cadence |
| 🟡 yellow | Some friction (slow adoption, open escalations, missed meetings) | Increase touch frequency; document risk |
| 🔴 red | At risk — escalate and build save plan | Escalate to manager; weekly check-ins; save plan in Asana |

---

## Renewal Cadence

| Days to renewal | Action |
|---|---|
| 90 | Initial renewal conversation; surface ROI from last 12 months |
| 60 | Send renewal proposal |
| 30 | Follow up; resolve any blockers |
| 14 | Confirm paperwork is in motion; escalate if not |

---

## How to Set Up Your Local Workbook

1. Open Excel or Google Sheets.
2. Create a sheet named `Customers`.
3. Add the required columns above as row 1 headers, exact spelling.
4. (Optional) Create an `Activity Log` sheet with columns: `Date`, `Customer Name`, `Activity Type`, `Notes`, `By`.
5. Save as `customer-master.xlsx` in this directory.
6. It will not be committed — `.gitignore` excludes `*.xlsx`.

---

## Commands that read the customer master

| Command | What it reads |
|---|---|
| `/renewal-health` | `Renewal Date`, `ARR`, `CSM Owner`, `Health Score` |
| `/at-risk` | `Health Score`, `Notes` |
| `/health-score` | All health-related columns |
| `/executive-summary` | Aggregate of ARR, health, renewal timing |
| `/qbr` | `Last QBR`, `Plan`, `Integration` |
| Renewal reports (`/renewals-*`) | Match by `Customer Name` against the Finance renewals sheet |

Keep column names exactly as listed above. The commands match on header text.
