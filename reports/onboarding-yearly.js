"use strict";
// reports/onboarding-yearly.js — Yearly/YTD Onboarding CARR report generator
// Usage: node reports/onboarding-yearly.js <path-to-metrics.json>
// Output: out/Onboarding_YTD_YYYY.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "sourceFile",
                  "kpis", "multiYearTable", "allTimeStats", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

const periodParts = d.period ? d.period.split(" ") : [];
if (periodParts.length < 2) {
  console.error(`Invalid period format: "${d.period}". Expected "YYYY YTD" (e.g. "2026 YTD")`);
  process.exit(1);
}
const yr = periodParts[0];
const outFile = path.join(outDir, `Onboarding_YTD_${yr}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:    "CUSTOMER SUCCESS  ·  ONBOARDING INTELLIGENCE",
  title:      `YTD Onboarding Report — ${yr}`,
  dateRange:  d.dateRange,
  generated:  d.generated,
  preparedBy: d.preparedBy,
  kpis:       d.kpis,
}));

// Multi-Year Overview
// columns: Year | Started | Completed | CARR Onboarded | CARR In-Flight | Avg Days
// widths:  [1200, 1100, 1100, 2120, 2120, 1720] = 9360
children.push(...T.sectionHead("Multi-Year Overview"));
children.push(T.dataTable({
  columnWidths: [1200, 1100, 1100, 2120, 2120, 1720],
  header: ["Year", "Started", "Completed", "CARR Onboarded", "CARR In-Flight", "Avg Days"],
  align: [T.AlignmentType.LEFT,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.multiYearTable,
}));
children.push(T.gap(80));
children.push(T.para(`* ${yr} YTD = Jan 1 – ${d.generated} (partial year)`, {
  size: 17, color: T.COLORS.grayTx, italics: true,
}));
children.push(T.gap(160));

// Quarter-by-Quarter (optional)
if (d.quarterlyTable && d.quarterlyTable.length > 0) {
  // columns: Quarter | Started | Completed | CARR Completed | CARR In-Flight
  // widths:  [1560, 1000, 1000, 2900, 2900] = 9360
  children.push(...T.sectionHead(`Quarter-by-Quarter — ${yr}`));
  children.push(T.dataTable({
    columnWidths: [1560, 1000, 1000, 2900, 2900],
    header: ["Quarter", "Started", "Completed", "CARR Completed", "CARR In-Flight"],
    align: [T.AlignmentType.LEFT,
            T.AlignmentType.CENTER, T.AlignmentType.CENTER,
            T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: d.quarterlyTable || [],
  }));
  children.push(T.gap(160));
}

// All-Time Stats
const at = d.allTimeStats || {};
children.push(...T.sectionHead("All-Time Totals"));
children.push(T.callout({
  kind: "neutral",
  tag: "All-Time Snapshot",
  body: `${at.accountsCompleted} accounts onboarded  ·  ${at.carrOnboarded} CARR  ·  ${at.avgDaysToGoLive} avg days to go-live  ·  ${at.activeAccounts} currently in-flight`,
}));
children.push(T.gap(100));
children.push(T.dataTable({
  // columns: Metric | Value
  // widths:  [3000, 6360] = 9360
  columnWidths: [3000, 6360],
  header: ["Metric", "Value"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Total accounts onboarded",  at.accountsCompleted  || "—"],
    ["Total CARR onboarded",       at.carrOnboarded      || "—"],
    ["Currently in-flight",        at.activeAccounts     || "—"],
    ["CARR in-flight",             at.carrInFlight       || "—"],
    ["Avg days to go-live",        at.avgDaysToGoLive    || "—"],
    ["Fastest go-live",            at.fastestGoLive      || "—"],
    ["Longest onboarding",         at.longestOnboarding  || "—"],
    ["Top account by CARR",        at.topAccountByCarr   || "—"],
    ["Total accounts tracked",     at.totalAccounts      || "—"],
  ],
}));
children.push(T.gap(160));

// Top Accounts (optional)
if (d.topAccountsTable && d.topAccountsTable.length > 0) {
  children.push(T.pageBreak());
  // columns: Rank | Customer | Project | CARR | Status
  // widths:  [480, 2600, 2600, 1680, 2000] = 9360
  children.push(...T.sectionHead(`Top Accounts by CARR — ${yr}`));
  children.push(T.dataTable({
    columnWidths: [480, 2600, 2600, 1680, 2000],
    header: ["Rank", "Customer", "Project", "CARR", "Status"],
    align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT,
            T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: d.topAccountsTable,
  }));
  children.push(T.gap(160));
}

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
  `# Onboarding YTD Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  `# Source: ${d.sourceFile}`,
  `# Rows processed: ${d.methodology.rowsProcessed}`,
  `# Asana tasks pulled: ${d.methodology.asanaTasks || 0}`,
  `# Window: ${d.methodology.period}`,
  "",
  "# CARR and account data sourced from finance mastersheet",
  "# Prior years sourced from historical mastersheet data if available",
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

const doc = T.buildDocument({ children, headerRight: `YTD Onboarding Intelligence — ${yr}` });
T.publishReport(doc, outFile, {
  category: "Onboarding",
  label: "YTD",
  csvSections: [
      { title: "Year Comparison", headers: ["Year", "Started", "Completed", "CARR Onboarded", "CARR In-Flight", "Avg Days"], rows: d.multiYearTable || [] },
      { title: "Quarterly Breakdown", headers: ["Quarter", "Started", "Completed", "CARR Completed", "CARR In-Flight"], rows: d.quarterlyTable || [] },
      { title: "Top Accounts", headers: ["Rank", "Customer", "Project", "CARR", "Status"], rows: d.topAccountsTable || [] },
      { title: "At-Risk & Blocked", headers: ["Customer", "Project", "CARR", "Issue", "Urgent"],
        rows: (d.atRisk || []).map(r => [r.customer, r.project, r.carr, r.issue, r.urgent ? "Yes" : "No"]) },
      { title: "Backlog Pipeline", headers: ["Customer", "Project", "CARR"], rows: d.backlogTable || [] },
    ],
});
