"use strict";
// reports/onboarding-monthly.js — Monthly Onboarding CARR report generator
// Usage: node reports/onboarding-monthly.js <path-to-metrics.json>
// Output: out/Onboarding_Monthly_YYYY-MM.docx
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

const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "sourceFile",
                  "kpis", "summaryTable", "accountsTable", "methodology"];
const missing = REQUIRED.filter(k => d[k] == null);
if (missing.length) {
  console.error(`Missing required fields in metrics JSON: ${missing.join(", ")}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, "../out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const periodParts = d.period ? d.period.split(" ") : [];
if (periodParts.length < 2) {
  console.error(`Invalid period format: "${d.period}". Expected "Month Year" (e.g. "May 2026")`);
  process.exit(1);
}
const [mon, yr] = periodParts;
const mi = MONTHS.findIndex(m => m === mon || m.startsWith(mon.slice(0, 3)));
if (mi < 0) {
  console.error(`Unknown month: "${mon}". Expected a full or abbreviated month name.`);
  process.exit(1);
}
const outFile = path.join(outDir, `Onboarding_Monthly_${yr}-${String(mi + 1).padStart(2, "0")}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS  ·  ONBOARDING INTELLIGENCE",
  title:   `Monthly Report — ${d.period}`,
  subtitle: [
    { text: d.dateRange + "  ", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "CONFIDENTIAL"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Executive Summary
// columns: Metric | This Month | Last Month | Change
// widths:  [3360, 1800, 1800, 2400] = 9360
children.push(...T.sectionHead("Executive Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", d.period, d.priorPeriod || "Prior Month", "Change"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summaryTable,
}));
children.push(T.gap(120));

if (d.qtdContext) {
  children.push(T.callout({ kind: "neutral", tag: "Quarter-to-Date", body: d.qtdContext }));
  children.push(T.gap(100));
}

// Week-by-Week Progress (optional)
if (d.weeklyTable && d.weeklyTable.length > 0) {
  // columns: Week | Started | Completed | CARR Completed | CARR In-Flight
  // widths:  [2400, 1140, 1140, 2340, 2340] = 9360
  children.push(...T.sectionHead(`Week-by-Week — ${d.period}`));
  children.push(T.dataTable({
    columnWidths: [2400, 1140, 1140, 2340, 2340],
    header: ["Week", "Started", "Completed", "CARR Completed", "CARR In-Flight"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
            T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: d.weeklyTable,
  }));
  children.push(T.gap(160));
}

// Account Detail
// columns: Customer | Project | CARR | Status | Start Date
// widths:  [2200, 1960, 1200, 1800, 2200] = 9360
children.push(...T.sectionHead("Account Detail"));
children.push(T.dataTable({
  columnWidths: [2200, 1960, 1200, 1800, 2200],
  header: ["Customer", "Project", "CARR", "Status", "Start Date"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.accountsTable,
}));
children.push(T.gap(160));

// At-Risk & Blocked (optional)
if (d.atRisk && d.atRisk.length > 0) {
  children.push(...T.sectionHead("At-Risk & Blocked"));
  const urgentRisk = d.atRisk.filter(r => r.urgent);
  const watchRisk  = d.atRisk.filter(r => !r.urgent);
  for (const r of urgentRisk) {
    children.push(T.callout({ kind: "warn", tag: `Blocked — ${r.customer}`, body: `${r.project}  ·  ${r.carr}  ·  ${r.issue}` }));
    children.push(T.gap(60));
  }
  if (watchRisk.length > 0) {
    // columns: Customer | Project | CARR | Issue
    // widths:  [2400, 2000, 1200, 3760] = 9360
    children.push(T.dataTable({
      columnWidths: [2400, 2000, 1200, 3760],
      header: ["Customer", "Project", "CARR", "Issue"],
      align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
              T.AlignmentType.CENTER, T.AlignmentType.LEFT],
      rows: watchRisk.map(r => [r.customer, r.project, r.carr, r.issue]),
    }));
  }
  children.push(T.gap(160));
}

// Backlog Pipeline (optional — awaiting product/engineering readiness)
if (d.backlogTable && d.backlogTable.length > 0) {
  // columns: Customer | Project | CARR
  // widths:  [3160, 3200, 3000] = 9360
  children.push(...T.sectionHead("Backlog Pipeline — Product Pending"));
  children.push(T.callout({
    kind: "neutral",
    tag:  "Product Pending",
    body: `${d.backlogTable.length} account${d.backlogTable.length > 1 ? "s" : ""} · ${d.carrBacklog || "—"} CARR · Awaiting product readiness from engineering before onboarding can begin.`,
  }));
  children.push(T.gap(60));
  children.push(T.dataTable({
    columnWidths: [3160, 3200, 3000],
    header: ["Customer", "Project", "CARR"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
    rows: d.backlogTable,
  }));
  children.push(T.gap(160));
}

// Asana Task Health (optional)
if (d.asanaTable && d.asanaTable.length > 0) {
  // columns: Category | Complete | Open | Overdue | Notes
  // widths:  [2800, 1390, 1390, 1390, 2390] = 9360
  children.push(...T.sectionHead("Asana Task Health"));
  children.push(T.dataTable({
    columnWidths: [2800, 1390, 1390, 1390, 2390],
    header: ["Category", "Complete", "Open", "Overdue", "Notes"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
            T.AlignmentType.CENTER, T.AlignmentType.LEFT],
    rows: d.asanaTable,
  }));
  children.push(T.gap(160));
}

// Recommendations (optional)
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
  `# Onboarding Monthly Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  `# Source: ${d.sourceFile}`,
  `# Rows processed: ${d.methodology.rowsProcessed}`,
  `# Asana tasks pulled: ${d.methodology.asanaTasks || 0}`,
  `# Window: ${d.methodology.period}`,
  "",
  "# CARR and account data sourced from finance mastersheet",
  "# Task health sourced from Asana via MCP",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Primary source",   `Finance mastersheet — ${d.sourceFile}`],
    ["Secondary source", "Asana (task health, milestone status)"],
    ["Period",           d.methodology.period],
    ["Rows processed",   String(d.methodology.rowsProcessed)],
    ["Asana tasks",      String(d.methodology.asanaTasks || 0)],
    ["Time zone",        "Mountain Time (America/Denver)"],
    ["Prepared by",      d.preparedBy],
    ["Generated",        d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Monthly Onboarding — ${d.period}` });
T.render(doc, outFile)
  .then(() => {
    console.log(`✓ ${outFile}`);
    copyToDesktop(outFile, "Onboarding", "Monthly");
    writeCsv(outFile.replace(".docx", ".csv"), [
      { title: "Summary", headers: ["Metric", d.period, d.priorPeriod || "Prior Month", "Change"], rows: d.summaryTable || [] },
      { title: "Weekly Breakdown", headers: ["Week", "Started", "Completed", "CARR Completed", "CARR In-Flight"], rows: d.weeklyTable || [] },
      { title: "Active Accounts", headers: ["Customer", "Project", "CARR", "Status", "Start Date"], rows: d.accountsTable || [] },
      { title: "At-Risk & Blocked", headers: ["Customer", "Project", "CARR", "Issue", "Urgent"],
        rows: (d.atRisk || []).map(r => [r.customer, r.project, r.carr, r.issue, r.urgent ? "Yes" : "No"]) },
      { title: "Backlog Pipeline", headers: ["Customer", "Project", "CARR"], rows: d.backlogTable || [] },
    ]);
  })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
