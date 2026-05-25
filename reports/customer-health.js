"use strict";
// reports/customer-health.js — Portfolio Customer Health Score report generator
// Usage: node reports/customer-health.js <path-to-metrics.json>
// Output: out/Customer_Health_YYYY-MM-DD.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir, dateSlug } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("customer health metrics");

const REQUIRED = ["generated", "period", "preparedBy", "kpis", "accounts",
                  "summary", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();
const slug = dateSlug(d.generated);
const outFile = path.join(outDir, `Customer_Health_${slug}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:        "CUSTOMER SUCCESS  ·  HEALTH INTELLIGENCE",
  title:          `Portfolio Health — ${d.period}`,
  dateRange:      d.dateRange,
  generated:      d.generated,
  preparedBy:     d.preparedBy,
  kpis:           d.kpis,
  classification: "INTERNAL",
}));

// Portfolio Health Summary
// columns: Status | Count | Pct
// widths:  [4160, 2600, 2600] = 9360
children.push(...T.sectionHead("Portfolio Health Summary"));
children.push(T.dataTable({
  columnWidths: [4160, 2600, 2600],
  header: ["Health Status", "Accounts", "% of Portfolio"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summary,
}));
children.push(T.gap(160));

// Account Health Scorecard
// columns: Customer | CSM | Health | Last Contact | Open Issues | Overdue Tasks
// widths:  [2400, 1600, 1200, 1760, 1200, 1200] = 9360
children.push(...T.sectionHead("Account Health Scorecard"));
children.push(T.dataTable({
  columnWidths: [2400, 1600, 1200, 1760, 1200, 1200],
  header: ["Customer", "CSM", "Health", "Last Contact", "Open Issues", "Tasks Overdue"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: (d.accounts || []).map(a => [
    a.customer || "—",
    a.csm || "—",
    a.healthScore || "—",
    a.lastContact || "—",
    String(a.openIssues ?? "—"),
    String(a.tasksOverdue ?? "—"),
  ]),
}));
children.push(T.gap(160));

// At-Risk Accounts
const atRisk = (d.atRisk || []);
children.push(...T.sectionHead("At-Risk Accounts"));
if (atRisk.length === 0) {
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "No at-risk accounts this period." }));
} else {
  const urgent = atRisk.filter(r => r.critical || r.urgent);
  const watch  = atRisk.filter(r => !r.critical && !r.urgent);
  for (const r of urgent) {
    children.push(T.callout({ kind: "warn", tag: `At Risk — ${r.customer}`, body: `${r.issue}  ·  Owner: ${r.owner || "—"}  ·  Action: ${r.action || "—"}` }));
    children.push(T.gap(60));
  }
  if (watch.length > 0) {
    // columns: Customer | Issue | Owner | Recommended Action
    // widths:  [2400, 3160, 1600, 2200] = 9360
    children.push(T.dataTable({
      columnWidths: [2400, 3160, 1600, 2200],
      header: ["Customer", "Issue", "Owner", "Recommended Action"],
      align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
              T.AlignmentType.LEFT, T.AlignmentType.LEFT],
      rows: watch.map(r => [r.customer, r.issue, r.owner || "—", r.action || "—"]),
    }));
  }
}
children.push(T.gap(160));

// Renewal Radar (optional)
const upcoming = (d.upcomingRenewals || []);
if (upcoming.length > 0) {
  // columns: Customer | Renewal Date | Days Out | ARR | Risk
  // widths:  [2800, 1760, 1200, 1600, 2000] = 9360
  children.push(...T.sectionHead("Renewal Radar — Next 90 Days"));
  children.push(T.dataTable({
    columnWidths: [2800, 1760, 1200, 1600, 2000],
    header: ["Customer", "Renewal Date", "Days Out", "ARR", "Renewal Risk"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER,
            T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: upcoming.map(r => [r.customer, r.renewalDate, String(r.daysOut ?? "—"), r.arr || "—", r.risk || "—"]),
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
  `# Customer Health Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  `# Accounts tracked: ${(d.accounts || []).length}`,
  `# At-risk accounts: ${atRisk.length}`,
  "",
  "# Health scores sourced from Asana task health, Intercom open issues,",
  "# days since last contact (Gmail/Calendar), and Shortcut open stories.",
  `# ${d.timeZone || "Local time zone"} for all timestamps`,
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Accounts tracked",    String((d.accounts || []).length)],
    ["Sources",             (d.methodology.sources || []).join(", ")],
    ["Period",              d.period],
    ["Time zone",           d.timeZone || "your local time zone"],
    ["Prepared by",         d.preparedBy],
    ["Generated",           d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Portfolio Health — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Health Reports",
  label: "Portfolio",
  csvSections: [
      { title: "Portfolio Summary", headers: ["Status", "Accounts", "% of Portfolio"], rows: d.summary || [] },
      { title: "Account Scorecard", headers: ["Customer", "CSM", "Health", "Last Contact", "Open Issues", "Tasks Overdue"],
        rows: (d.accounts || []).map(a => [a.customer, a.csm, a.healthScore, a.lastContact, a.openIssues, a.tasksOverdue]) },
      { title: "At-Risk Accounts", headers: ["Customer", "Issue", "Owner", "Action", "Critical"],
        rows: atRisk.map(r => [r.customer, r.issue, r.owner, r.action, r.critical ? "Yes" : "No"]) },
      { title: "Renewal Radar", headers: ["Customer", "Renewal Date", "Days Out", "ARR", "Risk"],
        rows: upcoming.map(r => [r.customer, r.renewalDate, r.daysOut, r.arr, r.risk]) },
    ],
});
