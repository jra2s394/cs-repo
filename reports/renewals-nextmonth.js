"use strict";
// reports/renewals-nextmonth.js — Next Month Renewals invoice pipeline generator
// Usage: node reports/renewals-nextmonth.js <path-to-metrics.json>
// Output: out/Renewals_NextMonth_YYYY-MM.docx
const T = require("../lib/report-theme");
const { copyToDesktop } = require("../lib/copy-to-desktop");
const { writeCsv } = require("../lib/csv-export");
const path = require("path");
const fs = require("fs");

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error(`Usage: node ${path.basename(process.argv[1])} <path-to-metrics.json>`);
  process.exit(1);
}
let d;
try {
  d = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
} catch (err) {
  console.error(`Error loading metrics: ${err.message}`);
  process.exit(1);
}
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "invoiceTable", "summaryTable", "methodology"];
const missing = REQUIRED.filter(k => d[k] == null);
if (missing.length) {
  console.error(`Missing required fields in metrics JSON: ${missing.join(", ")}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, "../out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const parts = (d.period || "").split(" ");
const mon = parts[0]; const yr = parts[1] || "";
const mi = MONTHS.findIndex(m => m === mon || m.startsWith(mon.slice(0,3)));
const slug = mi >= 0 ? `${yr}-${String(mi+1).padStart(2,"0")}` : yr;
const outFile = path.join(outDir, `Renewals_NextMonth_${slug}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS INTELLIGENCE",
  title:   `Upcoming Renewals — ${d.period}`,
  subtitle: [
    { text: d.dateRange + "  ", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "CONFIDENTIAL — FINANCE USE"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Summary
children.push(...T.sectionHead("Renewal Pipeline Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", d.period, "Prior", "Notes"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.LEFT],
  rows: d.summaryTable,
}));
children.push(T.gap(160));

// Invoice Table
children.push(...T.sectionHead("Invoice Detail — Action Required by " + d.period));
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
  rows: d.invoiceTable,
}));
children.push(T.gap(160));

// Flags
children.push(...T.sectionHead("Flags — Confirm Before Month End"));
if (d.flags && d.flags.length > 0) {
  for (const fl of d.flags) {
    children.push(T.callout({
      kind: fl.urgent ? "warn" : "neutral",
      tag:  fl.urgent ? `🔴 ${fl.customer}` : `🟡 ${fl.customer}`,
      body: fl.issue,
    }));
    children.push(T.gap(60));
  }
} else {
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "All accounts confirmed renewing — no flags." }));
}
children.push(T.gap(160));

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
  "# Billing logic:",
  "#   Volume: Quantity × Per Unit Cost",
  "#   Fixed:  ARR × (1 + uplift rate)",
  "#   Pre-calc: Amount column used directly",
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

const doc = T.buildDocument({ children, headerRight: `Upcoming Renewals — ${d.period}` });
T.render(doc, outFile)
  .then(() => {
    console.log(`✓ ${outFile}`);
    copyToDesktop(outFile, "Renewals", "NextMonth");
    writeCsv(outFile.replace(".docx", ".csv"), [
      { title: "Summary", headers: ["Metric", d.period, "Prior", "Notes"], rows: d.summaryTable || [] },
      { title: "Invoices", headers: ["Customer", "Type", "Curr ARR", "Billing Basis", "Invoice Amt", "Renew?", "CS Notes"], rows: d.invoiceTable || [] },
    ]);
  })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
