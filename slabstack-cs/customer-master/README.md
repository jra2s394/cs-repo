# Customer Master

Single source of truth for all Slabstack customers. Tracks ARR, renewal dates, health, and ownership.

---

## Files

| File | Description |
|------|-------------|
| `customer-master.xlsx` | Master tracker — all customers, ARR, renewal dates, CSM, health |

---

## Field Definitions

| Field | Description |
|-------|-------------|
| Customer Name | Legal company name |
| ARR | Annual recurring revenue in USD |
| MRR | Monthly recurring revenue in USD |
| Contract Start | Original contract start date |
| Renewal Date | Next renewal date |
| Contract Length | 12 / 24 / 36 month |
| CSM Owner | Assigned customer success manager |
| Health Score | Red / Yellow / Green |
| Plan | Tier or plan name |
| Integration | Sysdyne / None / Other |
| Last QBR | Date of most recent QBR |
| Notes | Key context or risk flags |

---

## Health Score Definitions

| Score | Definition |
|-------|------------|
| 🟢 Green | Engaged, using product, low churn risk |
| 🟡 Yellow | Some friction, monitor closely |
| 🔴 Red | At risk — escalate and build save plan |

---

## Renewal Cadence

| Days to Renewal | Action |
|----------------|--------|
| 90 days | Initial renewal conversation |
| 60 days | Send renewal proposal |
| 30 days | Follow up, resolve blockers |
| 14 days | Confirm paperwork in progress |
