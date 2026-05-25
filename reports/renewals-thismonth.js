"use strict";
// reports/renewals-thismonth.js — This Month Renewals invoice report generator
// Usage: node reports/renewals-thismonth.js <path-to-metrics.json>
// Output: out/Renewals_ThisMonth_YYYY-MM.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "invoiceTable", "summaryTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

// Period "May 2026" → slug "2026-05"
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const parts = (d.period || "").split(" ");
const mon = parts[0]; const yr = parts[1] || "";
const mi = MONTHS.findIndex(m => m === mon || m.startsWith(mon.slice(0,3)));
const slug = mi >= 0 ? `${yr}-${String(mi+1).padStart(2,"0")}` : yr;
const outFile = path.join(outDir, `Renewals_ThisMonth_${slug}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:        "CUSTOMER SUCCESS INTELLIGENCE",
  title:          `Renewals — ${d.period}`,
  dateRange:      d.dateRange,
  generated:      d.generated,
  preparedBy:     d.preparedBy,
  kpis:           d.kpis,
  classification: "CONFIDENTIAL — FINANCE USE",
}));

// Renewal Summary
children.push(...T.sectionHead("Renewal Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", d.period, "Prior", "Notes"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.LEFT],
  rows: d.summaryTable,
}));
children.push(T.gap(160));

// Invoice Table
children.push(...T.sectionHead("Invoice Detail"));
children.push(T.dataTable({
  // Customer | Type | Current ARR | Billing Basis | Invoice Amount | Renew? | Notes
  columnWidths: [2200, 900, 1000, 1800, 1060, 600, 1800],
  header: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"],
  align: [
    T.AlignmentType.LEFT,
    T.AlignmentType.CENTER,
    T.AlignmentType.CENTER,
    T.AlignmentType.LEFT,
    T.AlignmentType.CENTER,
    T.AlignmentType.CENTER,
    T.AlignmentType.LEFT,
  ],
  rows: d.invoiceTable,
}));
children.push(T.gap(160));

// Flags
if (d.flags && d.flags.length > 0) {
  children.push(...T.sectionHead("Flags — Review Before Invoicing"));
  for (const fl of d.flags) {
    children.push(T.callout({
      kind: fl.urgent ? "warn" : "neutral",
      tag:  fl.urgent ? `🔴 ${fl.customer}` : `🟡 ${fl.customer}`,
      body: fl.issue,
    }));
    children.push(T.gap(60));
  }
  children.push(T.gap(100));
} else {
  children.push(...T.sectionHead("Flags — Review Before Invoicing"));
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "All accounts confirmed renewing — no flags." }));
  children.push(T.gap(160));
}

// Recommendations
if (d.recs && d.recs.length > 0) {
  children.push(...T.sectionHead("Recommendations"));
  d.recs.forEach((r, i) => {
    children.push(T.recBlock(r));
    if (i < d.recs.length - 1) children.push(T.gap(100));
  });
  children.push(T.gap(160));
}

// Methodology
children.push(T.pageBreak());
children.push(...T.sectionHead("How This Report Is Built"));
children.push(T.subHead("Data Sources & Methodology"));
children.push(T.codeBlock([
  `# Renewals Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "# Source: Finance Renewals sheet (Excel/CSV)",
  `# File: ${d.sourceFile || d.methodology.sourceFile}`,
  `# Rows processed: ${d.methodology.rowsProcessed}`,
  "",
  "# Billing logic:",
  "#   Volume contract: Quantity × Per Unit Cost",
  "#   Fixed contract:  Current ARR × (1 + uplift rate)",
  "#   Pre-calculated:  Amount column used directly",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Source file",    d.sourceFile || d.methodology.sourceFile || "—"],
    ["Rows processed", String(d.methodology.rowsProcessed)],
    ["Period",         d.methodology.period],
    ["Prepared by",    d.preparedBy],
    ["Generated",      d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Renewals — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Renewals",
  label: "ThisMonth",
  csvSections: [
      { title: "Summary", headers: ["Metric", d.period, "Prior", "Notes"], rows: d.summaryTable || [] },
      { title: "Invoices", headers: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"], rows: d.invoiceTable || [] },
    ],
});
