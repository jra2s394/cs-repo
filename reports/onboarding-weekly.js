"use strict";
// reports/onboarding-weekly.js — Weekly Onboarding CARR report generator
// Usage: node reports/onboarding-weekly.js <path-to-metrics.json>
// Output: out/Onboarding_Weekly_YYYY-MM-DD.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir, dateSlug } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "sourceFile",
                  "kpis", "summaryTable", "accountsTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

const slug = (d.weekStartDate && /^\d{4}-\d{2}-\d{2}$/.test(d.weekStartDate))
  ? d.weekStartDate
  : dateSlug(d.generated);
const outFile = path.join(outDir, `Onboarding_Weekly_${slug}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS  ·  ONBOARDING INTELLIGENCE",
  title:   `Weekly Report — ${d.period}`,
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
// columns: Metric | This Week | Last Week | Change
// widths:  [3360, 1800, 1800, 2400] = 9360
children.push(...T.sectionHead("Executive Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", "This Week", d.priorPeriod || "Last Week", "Change"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summaryTable,
}));
children.push(T.gap(160));

// Active Accounts
// columns: Customer | Project | CARR | Status | Days In
// widths:  [2400, 2000, 1200, 1800, 1960] = 9360
children.push(...T.sectionHead("Active Accounts"));
children.push(T.dataTable({
  columnWidths: [2400, 2000, 1200, 1800, 1960],
  header: ["Customer", "Project", "CARR", "Status", "Days In"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.accountsTable,
}));
children.push(T.gap(160));

// At-Risk & Blocked
children.push(...T.sectionHead("At-Risk & Blocked"));
const urgentRisk = (d.atRisk || []).filter(r => r.urgent);
const watchRisk  = (d.atRisk || []).filter(r => !r.urgent);

if (!d.atRisk || d.atRisk.length === 0) {
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "No at-risk or blocked accounts this week." }));
} else {
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
}
children.push(T.gap(160));

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
  // columns: Category | Complete | Open | Overdue
  // widths:  [3360, 2000, 2000, 2000] = 9360
  children.push(...T.sectionHead("Asana Task Health"));
  children.push(T.dataTable({
    columnWidths: [3360, 2000, 2000, 2000],
    header: ["Category", "Complete", "Open", "Overdue"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER,
            T.AlignmentType.CENTER, T.AlignmentType.CENTER],
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
  `# Onboarding Weekly Report — ${d.period}`,
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

const doc = T.buildDocument({ children, headerRight: `Weekly Onboarding — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Onboarding",
  label: "Weekly",
  csvSections: [
      { title: "Summary", headers: ["Metric", "This Week", d.priorPeriod || "Last Week", "Change"], rows: d.summaryTable || [] },
      { title: "Active Accounts", headers: ["Customer", "Project", "CARR", "Status", "Days In"], rows: d.accountsTable || [] },
      { title: "At-Risk & Blocked", headers: ["Customer", "Project", "CARR", "Issue", "Urgent"],
        rows: (d.atRisk || []).map(r => [r.customer, r.project, r.carr, r.issue, r.urgent ? "Yes" : "No"]) },
      { title: "Backlog Pipeline", headers: ["Customer", "Project", "CARR"], rows: d.backlogTable || [] },
    ],
});
