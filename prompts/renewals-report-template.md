# Renewals Report — Shared Data Processing Template

This template defines the shared logic for all three renewals commands:
`/renewals-thismonth`, `/renewals-nextmonth`, `/renewals-nextquarter`

---

## Step 1 — Read and inspect the sheet

```python
import openpyxl, csv, os, sys
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("<your IANA TZ from ~/.claude/CLAUDE.md, e.g. America/Denver>")
today = datetime.now(MT).date()

path = "<user-provided path>"
ext = os.path.splitext(path)[1].lower()

if ext in (".xlsx", ".xls"):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows_raw = list(ws.values)
elif ext == ".csv":
    import csv
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows_raw = list(csv.reader(f))
else:
    print("Unsupported file type. Please provide .xlsx or .csv")
    sys.exit(1)

headers = [str(h).strip() if h else "" for h in rows_raw[0]]
print("Headers:", headers)
print("Row 2:", rows_raw[1] if len(rows_raw) > 1 else "(empty)")
```

---

## Step 2 — Map columns

```python
def find_col(keywords, headers):
    for kw in keywords:
        for i, h in enumerate(headers):
            if kw.lower() in h.lower():
                return i
    return None

col_txn      = find_col(["transaction","txn","ss-"], headers)
col_customer = find_col(["customer","client","account"], headers)
col_item     = find_col(["item","product","subscription"], headers)
col_order    = find_col(["order date","order"], headers)
col_start    = find_col(["start date","start"], headers)
col_end      = find_col(["end date","end","expir"], headers)
col_class    = find_col(["class","type","category"], headers)
col_qty      = find_col(["quantity","qty","volume","units"], headers)
col_arr      = find_col(["home arr","arr","annual","revenue"], headers)
col_renew    = find_col(["renew","renewal flag","renew?"], headers)
col_rate     = find_col(["0.05","rate","increase","uplift"], headers)
col_per_unit = find_col(["per unit","unit cost","unit price","per_unit"], headers)
col_amount   = find_col(["amount","invoice","total","renewal amount"], headers)
col_notes    = find_col(["notes","comment","ta notes","remarks"], headers)
```

---

## Step 3 — Parse dates and values

```python
def parse_date(v):
    if v is None: return None
    if isinstance(v, (datetime,)): return v.date()
    if isinstance(v, date): return v
    s = str(v).strip()
    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y"]:
        try: return datetime.strptime(s, fmt).date()
        except: pass
    return None

def parse_float(v):
    if v is None: return None
    try: return float(str(v).replace(",","").replace("$","").strip())
    except: return None

def fmt_carr(v):
    if v is None or v == 0: return "—"
    if v >= 1_000_000: return f"${v/1_000_000:.1f}M"
    if v >= 1000: return f"${v/1000:.1f}k"
    return f"${v:,.0f}"
```

---

## Step 4 — Determine billing type and invoice amount

For each row:

```python
def billing_type_and_amount(qty, arr, rate_val, per_unit_val, amount_val):
    """
    Returns (type_label, billing_basis_label, invoice_amount_float)

    Logic:
    - If per_unit_val is set (> 0) → Volume-based
        invoice = qty × per_unit_val
        basis   = "{qty:,.0f} units @ ${per_unit:.4f}"
    - Elif rate_val is set:
        - If rate_val < 2 → it's a rate (e.g. 0.05) → invoice = arr × (1 + rate_val)
          basis = f"ARR × (1 + {rate_val:.0%})"
        - Else → rate_val IS the invoice amount directly
          basis = "Fixed (pre-calculated)"
    - Elif amount_val is set → use it directly
        basis = "Fixed (pre-calculated)"
    - Else → invoice = arr (no change noted)
        basis = "Current ARR (no uplift)"
    """
    qty_f      = parse_float(qty)
    arr_f      = parse_float(arr)
    rate_f     = parse_float(rate_val)
    per_unit_f = parse_float(per_unit_val)
    amount_f   = parse_float(amount_val)

    if per_unit_f and per_unit_f > 0 and qty_f and qty_f > 0:
        invoice = round(qty_f * per_unit_f, 2)
        if qty_f >= 10000:
            qty_label = f"{qty_f/1000:,.0f}k"
        else:
            qty_label = f"{qty_f:,.0f}"
        basis = f"{qty_label} units @ ${per_unit_f:.4f}"
        return "Volume", basis, invoice

    if rate_f is not None and rate_f > 0:
        if rate_f < 2:  # it's a percentage rate
            invoice = round(arr_f * (1 + rate_f), 2) if arr_f else None
            basis = f"ARR × (1 + {rate_f:.0%})"
        else:  # it's the actual invoice amount
            invoice = rate_f
            basis = "Fixed (pre-calculated)"
        return "Fixed", basis, invoice

    if amount_f and amount_f > 0:
        return "Fixed", "Fixed (pre-calculated)", amount_f

    if arr_f:
        return "Fixed", "Current ARR (no uplift data)", arr_f

    return "Unknown", "—", None
```

---

## Step 5 — Build records

```python
records = []
for row in rows_raw[1:]:
    def g(idx): return row[idx] if idx is not None and idx < len(row) else None

    customer = str(g(col_customer) or "").strip()
    if not customer or customer.lower() in ("none","","nan"): continue

    txn      = str(g(col_txn) or "").strip()
    item     = str(g(col_item) or "").strip()
    end_date = parse_date(g(col_end))
    start_date = parse_date(g(col_start))
    cls      = str(g(col_class) or "").strip()
    qty      = g(col_qty)
    arr      = g(col_arr)
    renew    = str(g(col_renew) or "").strip().upper()
    rate_val = g(col_rate)
    per_unit = g(col_per_unit)
    amount   = g(col_amount)
    notes    = str(g(col_notes) or "").strip()

    btype, basis, invoice = billing_type_and_amount(qty, arr, rate_val, per_unit, amount)
    arr_f = parse_float(arr)

    records.append({
        "txn":       txn,
        "customer":  customer,
        "item":      item,
        "end_date":  end_date,
        "start_date":start_date,
        "class":     cls,
        "arr_float": arr_f,
        "arr_fmt":   fmt_carr(arr_f),
        "renew":     renew,
        "btype":     btype,
        "basis":     basis,
        "invoice":   invoice,
        "invoice_fmt": fmt_carr(invoice),
        "notes":     notes[:120] if notes else "",
    })

print(f"Parsed {len(records)} customer records")
```

---

## Step 6 — Filter by period

Renewal month = end_date.month + 1 (with year wrap).

```python
def renewal_month(r):
    """Returns (year, month) tuple representing when this contract renews."""
    ed = r["end_date"]
    if not ed: return None
    if ed.month == 12:
        return (ed.year + 1, 1)
    return (ed.year, ed.month + 1)

# Filter helpers (set target_year/target_month/target_quarter before calling)
def renews_in_month(r, year, month):
    rm = renewal_month(r)
    return rm == (year, month)

def renews_in_quarter(r, year, q):  # q = 1,2,3,4
    rm = renewal_month(r)
    if rm is None: return False
    ry, rm_mo = rm
    rq = (rm_mo - 1) // 3 + 1
    return ry == year and rq == q
```

---

## Step 7 — Build invoice table rows

Sort: NOT renewing first (flag), then by invoice amount descending.

```python
RENEW_STYLE = {
    "YES":   {"fill":"E9F2E9","color":"2E7D32","bold":True},
    "NO":    {"fill":"FAE8E8","color":"B23A2E","bold":True},
    "":      {"fill":"FAF0DA","color":"9C6B14","bold":True},
}

def invoice_table_rows(period_records):
    def sort_key(r):
        renew_order = {"NO":0, "":1, "YES":2}
        return (renew_order.get(r["renew"], 1), -(r["invoice"] or 0))
    sorted_recs = sorted(period_records, key=sort_key)
    rows = []
    for r in sorted_recs:
        style = RENEW_STYLE.get(r["renew"], RENEW_STYLE[""])
        renew_cell = {"text": r["renew"] or "?", **style}
        rows.append([
            r["customer"],
            r["btype"],
            r["arr_fmt"],
            r["basis"],
            r["invoice_fmt"],
            renew_cell,
            r["notes"][:80] if r["notes"] else "—",
        ])
    return rows
```

---

## Step 8 — Build flags list

```python
def build_flags(period_records):
    flags = []
    for r in period_records:
        if r["renew"] == "NO":
            flags.append({"customer":r["customer"],"issue":"Marked NOT renewing — confirm with CS before invoicing","urgent":True})
        elif r["renew"] == "":
            flags.append({"customer":r["customer"],"issue":"Renew status unknown — CS confirmation needed before invoicing","urgent":True})
        elif r["invoice"] is None:
            flags.append({"customer":r["customer"],"issue":"Invoice amount could not be calculated — check billing data in sheet","urgent":True})
        elif r["btype"] == "Volume" and (r["basis"] == "—" or not r["basis"]):
            flags.append({"customer":r["customer"],"issue":"Volume contract — confirm yardage projection before invoicing","urgent":False})
    return flags
```

---

## Step 9 — Compute summary totals

```python
def period_totals(period_records):
    total_arr     = sum(r["arr_float"] or 0 for r in period_records)
    total_invoice = sum(r["invoice"] or 0 for r in period_records)
    count_volume  = len([r for r in period_records if r["btype"] == "Volume"])
    count_fixed   = len([r for r in period_records if r["btype"] == "Fixed"])
    count_yes     = len([r for r in period_records if r["renew"] == "YES"])
    count_no      = len([r for r in period_records if r["renew"] == "NO"])
    count_unknown = len([r for r in period_records if r["renew"] == ""])
    return {
        "total_arr":     total_arr,
        "total_invoice": total_invoice,
        "count":         len(period_records),
        "count_volume":  count_volume,
        "count_fixed":   count_fixed,
        "count_yes":     count_yes,
        "count_no":      count_no,
        "count_unknown": count_unknown,
        "uplift":        total_invoice - total_arr,
        "uplift_pct":    round((total_invoice / total_arr - 1) * 100, 1) if total_arr else 0,
    }
```

---

## Metrics JSON schema (all three periods share this)

```json
{
  "period":        "[e.g. May 2026 or Q3 2026]",
  "periodType":    "[thismonth | nextmonth | nextquarter]",
  "dateRange":     "[e.g. May 1 – May 31, 2026]",
  "generated":     "[e.g. May 23, 2026]",
  "preparedBy":    "[Your Name]",
  "sourceFile":    "[filename]",
  "kpis": [
    { "value": "[count]",           "label": "Accounts",        "delta": "[renewing]" },
    { "value": "[total_invoice fmt]","label": "Invoice Total",  "delta": "[vs ARR delta]" },
    { "value": "[count_volume]",    "label": "Volume Contracts","delta": "[count_fixed] fixed" },
    { "value": "[count_no+unknown]","label": "Need Confirmation","delta": "[urgent if > 0]", "deltaColor":"B23A2E" }
  ],
  "invoiceTable": [
    ["[customer]","[type]","[arr fmt]","[billing basis]","[invoice fmt]",{"text":"YES/NO/?","fill":"...","color":"...","bold":true},"[notes]"]
  ],
  "summaryTable": [
    ["Total Current ARR",    "[fmt]","—","—"],
    ["Total Invoice Amount", "[fmt]","—","[uplift] uplift"],
    ["Accounts Renewing",    "[n]",  "—","—"],
    ["Volume Contracts",     "[n]",  "—","—"],
    ["Fixed-Rate Contracts", "[n]",  "—","—"],
    ["Pending Confirmation", "[n]",  "—","[🔴 if > 0]"]
  ],
  "flags": [
    { "customer": "[name]", "issue": "[description]", "urgent": true }
  ],
  "monthlyGroups": null,
  "methodology": {
    "sourceFile":    "[filename]",
    "rowsProcessed": "[int]",
    "period":        "[date range]"
  }
}
```

For `/renewals-nextquarter`, `monthlyGroups` is a list of 3 objects — one per month in the quarter — each with its own `invoiceTable` and totals. This allows Finance to see the quarter broken into invoicing waves.

---

## Output filenames

| Command | JSON | .docx |
|---|---|---|
| `/renewals-thismonth` | `data/outputs/renewals-thismonth-metrics-YYYY-MM-DD.json` | `out/Renewals_ThisMonth_YYYY-MM.docx` |
| `/renewals-nextmonth` | `data/outputs/renewals-nextmonth-metrics-YYYY-MM-DD.json` | `out/Renewals_NextMonth_YYYY-MM.docx` |
| `/renewals-nextquarter` | `data/outputs/renewals-nextquarter-metrics-YYYY-MM-DD.json` | `out/Renewals_NextQuarter_YYYY-QN.docx` |
