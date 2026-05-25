"use strict";
// reports/renewals-nextquarter.js — Next Quarter Renewals pipeline generator
// Usage: node reports/renewals-nextquarter.js <path-to-metrics.json>
// Output: out/Renewals_NextQuarter_YYYY-QN.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "summaryTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

// Period "Q3 2026" → slug "2026-Q3"
const parts = (d.period || "").split(" ");
const [ql, yr] = parts;
const outFile = path.join(outDir, `Renewals_NextQuarter_${yr}-${ql}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:        "CUSTOMER SUCCESS INTELLIGENCE",
  title:          `Renewal Pipeline — ${d.period}`,
  dateRange:      d.dateRange,
  generated:      d.generated,
  preparedBy:     d.preparedBy,
  kpis:           d.kpis,
  classification: "CONFIDENTIAL — FINANCE USE",
}));

// Quarter Summary
children.push(...T.sectionHead(`${d.period} Renewal Summary`));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", d.period, "Prior Qtr", "Notes"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.LEFT],
  rows: d.summaryTable,
}));
children.push(T.gap(160));

// Month-by-Month breakdown
const groups = d.monthlyGroups || [];
for (const grp of groups) {
  children.push(...T.sectionHead(grp.month || "Pending"));
  if (grp.pending || !grp.invoiceTable || grp.invoiceTable.length === 0) {
    children.push(T.callout({
      kind: "neutral",
      tag:  "Data Pending",
      body: `Finance sheet for ${grp.month} not yet available. Request from Finance when ready.`,
    }));
  } else {
    children.push(T.callout({
      kind: "neutral",
      tag:  "Month Total",
      body: `${grp.count || grp.invoiceTable.length} accounts · ${grp.totalInvoice || "—"} invoice total · ${grp.totalArr || "—"} current ARR`,
    }));
    children.push(T.gap(60));
    children.push(T.dataTable({
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
      rows: grp.invoiceTable,
    }));
    if (grp.flags && grp.flags.length > 0) {
      children.push(T.gap(60));
      for (const fl of grp.flags) {
        children.push(T.callout({
          kind: fl.urgent ? "warn" : "neutral",
          tag:  fl.urgent ? `🔴 ${fl.customer}` : `🟡 ${fl.customer}`,
          body: fl.issue,
        }));
        children.push(T.gap(40));
      }
    }
  }
  children.push(T.gap(160));
}

// If no monthly groups, fall back to flat invoice table
if (groups.length === 0 && d.invoiceTable && d.invoiceTable.length > 0) {
  children.push(...T.sectionHead("Invoice Detail"));
  children.push(T.dataTable({
    columnWidths: [2200, 900, 1000, 1800, 1060, 600, 1800],
    header: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"],
    align: [
      T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
      T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.LEFT,
    ],
    rows: d.invoiceTable,
  }));
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
children.push(T.codeBlock([
  `# Renewals Pipeline — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  `# Source: ${d.sourceFile || d.methodology.sourceFile}`,
  `# Rows processed: ${d.methodology.rowsProcessed}`,
  "",
  "# Each month section uses Finance's monthly renewals sheet.",
  "# Months without a Finance sheet are shown as Data Pending.",
  "# Billing logic: Volume = Qty × Unit Cost | Fixed = ARR × (1 + rate)",
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

const csvSections = [
  { title: "Summary", headers: ["Metric", d.period, "Prior Qtr", "Notes"], rows: d.summaryTable || [] },
];
for (const grp of (d.monthlyGroups || [])) {
  if (!grp.pending && grp.invoiceTable && grp.invoiceTable.length > 0) {
    csvSections.push({ title: grp.month, headers: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"], rows: grp.invoiceTable });
  }
}
if ((d.monthlyGroups || []).length === 0 && d.invoiceTable) {
  csvSections.push({ title: "Invoices", headers: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"], rows: d.invoiceTable });
}

const doc = T.buildDocument({ children, headerRight: `Renewal Pipeline — ${d.period}` });
T.publishReport(doc, outFile, { category: "Renewals", label: "NextQuarter", csvSections });
