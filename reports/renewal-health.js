"use strict";
// reports/renewal-health.js — Renewal Health Pipeline report generator
// Usage: node reports/renewal-health.js <path-to-metrics.json>
// Output: out/Renewal_Health_YYYY-MM-DD.docx
const T = require("../lib/report-theme");
const { copyToDesktop } = require("../lib/copy-to-desktop");
const { writeCsv } = require("../lib/csv-export");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("renewal health metrics");

const REQUIRED = ["generated", "period", "preparedBy", "kpis", "renewals",
                  "summary", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();
const dateSlug = (d.generated || "").replace(/[^0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown-date";
const outFile = path.join(outDir, `Renewal_Health_${dateSlug}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS  ·  RENEWAL INTELLIGENCE",
  title:   `Renewal Health — ${d.period}`,
  subtitle: [
    { text: d.dateRange ? d.dateRange + "  " : "", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "CONFIDENTIAL"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Renewal Pipeline Summary
// columns: Bucket | Count | ARR at Risk | Notes
// widths:  [2800, 1600, 2360, 2600] = 9360
children.push(...T.sectionHead("Renewal Pipeline Summary"));
children.push(T.dataTable({
  columnWidths: [2800, 1600, 2360, 2600],
  header: ["Bucket", "# Accounts", "ARR at Stake", "Notes"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER,
          T.AlignmentType.CENTER, T.AlignmentType.LEFT],
  rows: d.summary,
}));
children.push(T.gap(160));

// Full Renewal Pipeline
// columns: Customer | Renewal Date | Days Out | ARR | Risk | Status | Notes
// widths:  [2000, 1360, 800, 1200, 1000, 1200, 1800] = 9360
children.push(...T.sectionHead("Full Renewal Pipeline"));
children.push(T.dataTable({
  columnWidths: [2000, 1360, 800, 1200, 1000, 1200, 1800],
  header: ["Customer", "Renewal Date", "Days", "ARR", "Risk", "Status", "Notes"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER,
          T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.LEFT],
  rows: (d.renewals || []).map(r => [
    r.customer || "—",
    r.renewalDate || "—",
    String(r.daysOut ?? "—"),
    r.arr || r.currentARR || "—",
    r.risk || "—",
    r.status || "—",
    r.notes || "—",
  ]),
}));
children.push(T.gap(160));

// High-Risk Renewals (urgent callouts)
const highRisk = (d.renewals || []).filter(r => r.risk === "High");
if (highRisk.length > 0) {
  children.push(...T.sectionHead("High-Risk Renewals — Immediate Action"));
  for (const r of highRisk) {
    children.push(T.callout({
      kind: "warn",
      tag:  `High Risk — ${r.customer}`,
      body: `Renewal: ${r.renewalDate}  ·  ${r.daysOut} days out  ·  ${r.arr || r.currentARR || "—"}  ·  ${r.notes || "Needs attention"}`,
    }));
    children.push(T.gap(60));
  }
  children.push(T.gap(100));
}

// Renewal Playbook (optional)
if (d.playbook && d.playbook.length > 0) {
  children.push(...T.sectionHead("Renewal Playbook — Next Actions"));
  // columns: Customer | Owner | Action | Due Date
  // widths:  [2400, 1760, 3400, 1800] = 9360
  children.push(T.dataTable({
    columnWidths: [2400, 1760, 3400, 1800],
    header: ["Customer", "Owner", "Action", "Due Date"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
            T.AlignmentType.LEFT, T.AlignmentType.CENTER],
    rows: (d.playbook || []).map(p => [p.customer, p.owner || "—", p.action || "—", p.dueDate || "—"]),
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
  `# Renewal Health Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  `# Renewals tracked: ${(d.renewals || []).length}`,
  `# High-risk renewals: ${highRisk.length}`,
  "",
  "# Renewal data sourced from Gmail (contract emails), Asana (renewal tasks),",
  "# and Finance mastersheet when available. Risk scores are manual or derived",
  "# from days-to-renewal and last contact recency.",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Renewals tracked",  String((d.renewals || []).length)],
    ["High risk",         String(highRisk.length)],
    ["Sources",           (d.methodology.sources || []).join(", ")],
    ["Period",            d.period],
    ["Time zone",         "Mountain Time (America/Denver)"],
    ["Prepared by",       d.preparedBy],
    ["Generated",         d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Renewal Health — ${d.period}` });
T.render(doc, outFile)
  .then(() => {
    console.log(`✓ ${outFile}`);
    copyToDesktop(outFile, "Renewals", "Health");
    writeCsv(outFile.replace(".docx", ".csv"), [
      { title: "Pipeline Summary", headers: ["Bucket", "# Accounts", "ARR at Stake", "Notes"], rows: d.summary || [] },
      { title: "Renewal Pipeline", headers: ["Customer", "Renewal Date", "Days Out", "ARR", "Risk", "Status", "Notes"],
        rows: (d.renewals || []).map(r => [r.customer, r.renewalDate, r.daysOut, r.arr || r.currentARR, r.risk, r.status, r.notes]) },
      { title: "Renewal Playbook", headers: ["Customer", "Owner", "Action", "Due Date"],
        rows: (d.playbook || []).map(p => [p.customer, p.owner, p.action, p.dueDate]) },
    ]);
  })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
