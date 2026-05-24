"use strict";
// reports/executive-summary.js — Executive Summary report generator
// Usage: node reports/executive-summary.js <path-to-metrics.json>
// Output: out/Executive_Summary_YYYY-MM-DD.docx
const T = require("../lib/report-theme");
const { copyToDesktop } = require("../lib/copy-to-desktop");
const { writeCsv } = require("../lib/csv-export");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("executive summary metrics");

const REQUIRED = ["generated", "period", "preparedBy", "kpis", "portfolioMetrics",
                  "highlights", "openIssues", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();
const dateSlug = (d.generated || "").replace(/[^0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown-date";
const outFile = path.join(outDir, `Executive_Summary_${dateSlug}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS  ·  EXECUTIVE SUMMARY",
  title:   `Executive Summary — ${d.period}`,
  subtitle: [
    { text: d.dateRange ? d.dateRange + "  " : "", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "INTERNAL"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Portfolio Overview
// columns: Metric | Value | vs Prior Period
// widths:  [3360, 3000, 3000] = 9360
children.push(...T.sectionHead("Portfolio Overview"));
children.push(T.dataTable({
  columnWidths: [3360, 3000, 3000],
  header: ["Metric", "Current", d.priorPeriod || "vs Prior Period"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.portfolioMetrics,
}));
children.push(T.gap(160));

// Period Highlights
children.push(...T.sectionHead("Period Highlights"));
const critHighlights = (d.highlights || []).filter(h => h.critical);
const normHighlights  = (d.highlights || []).filter(h => !h.critical);
for (const h of critHighlights) {
  children.push(T.callout({ kind: "success", tag: h.category || "Win", body: h.text }));
  children.push(T.gap(60));
}
if (normHighlights.length > 0) {
  // columns: Category | Highlight
  // widths:  [2000, 7360] = 9360
  children.push(T.dataTable({
    columnWidths: [2000, 7360],
    header: ["Category", "Highlight"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
    rows: normHighlights.map(h => [h.category || "—", h.text || "—"]),
  }));
}
children.push(T.gap(160));

// Open Issues & Risks
const openIssues = d.openIssues || [];
children.push(...T.sectionHead("Open Issues & Risks"));
if (openIssues.length === 0) {
  children.push(T.callout({ kind: "success", tag: "No Open Issues", body: "No critical or watch-level issues this period." }));
} else {
  const critical = openIssues.filter(i => i.critical);
  const watch    = openIssues.filter(i => !i.critical);
  for (const i of critical) {
    children.push(T.callout({ kind: "warn", tag: `${i.area || "Issue"} — ${i.customer || "Portfolio"}`, body: `${i.description}  ·  Owner: ${i.owner || "—"}  ·  ETA: ${i.eta || "TBD"}` }));
    children.push(T.gap(60));
  }
  if (watch.length > 0) {
    // columns: Area | Customer | Description | Owner | ETA
    // widths:  [1600, 1800, 3160, 1400, 1400] = 9360
    children.push(T.dataTable({
      columnWidths: [1600, 1800, 3160, 1400, 1400],
      header: ["Area", "Customer", "Description", "Owner", "ETA"],
      align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
              T.AlignmentType.LEFT, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
      rows: watch.map(i => [i.area || "—", i.customer || "Portfolio", i.description || "—", i.owner || "—", i.eta || "—"]),
    }));
  }
}
children.push(T.gap(160));

// Onboarding Snapshot (optional)
if (d.onboardingSnapshot && d.onboardingSnapshot.length > 0) {
  // columns: Metric | Value
  // widths:  [4160, 5200] = 9360
  children.push(...T.sectionHead("Onboarding Snapshot"));
  children.push(T.dataTable({
    columnWidths: [4160, 5200],
    header: ["Metric", "Value"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
    rows: d.onboardingSnapshot,
  }));
  children.push(T.gap(160));
}

// Intercom Snapshot (optional)
if (d.intercomSnapshot && d.intercomSnapshot.length > 0) {
  // columns: Metric | Value
  // widths:  [4160, 5200] = 9360
  children.push(...T.sectionHead("Support Snapshot"));
  children.push(T.dataTable({
    columnWidths: [4160, 5200],
    header: ["Metric", "Value"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
    rows: d.intercomSnapshot,
  }));
  children.push(T.gap(160));
}

// Upcoming Events (optional)
if (d.upcomingEvents && d.upcomingEvents.length > 0) {
  // columns: Date | Customer | Event | Owner
  // widths:  [1600, 2400, 3760, 1600] = 9360
  children.push(...T.sectionHead("Upcoming Events"));
  children.push(T.dataTable({
    columnWidths: [1600, 2400, 3760, 1600],
    header: ["Date", "Customer", "Event", "Owner"],
    align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT,
            T.AlignmentType.LEFT,   T.AlignmentType.LEFT],
    rows: (d.upcomingEvents || []).map(e => [e.date || "—", e.customer || "—", e.event || "—", e.owner || "—"]),
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
  `# Executive Summary — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "# Data sourced from Gmail, Google Calendar, Asana, Intercom, and Shortcut.",
  "# Portfolio metrics are aggregated from live tool data plus Finance inputs",
  "# when provided. All wins are sourced — no estimated outcomes.",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Sources",     (d.methodology.sources || []).join(", ")],
    ["Period",      d.period],
    ["Time zone",   "Mountain Time (America/Denver)"],
    ["Prepared by", d.preparedBy],
    ["Generated",   d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Executive Summary — ${d.period}` });
T.render(doc, outFile)
  .then(() => {
    console.log(`✓ ${outFile}`);
    copyToDesktop(outFile, "Executive Summaries", "Summary");
    writeCsv(outFile.replace(".docx", ".csv"), [
      { title: "Portfolio Overview", headers: ["Metric", "Current", d.priorPeriod || "vs Prior Period"],
        rows: d.portfolioMetrics || [] },
      { title: "Highlights", headers: ["Category", "Highlight", "Critical"],
        rows: (d.highlights || []).map(h => [h.category, h.text, h.critical ? "Yes" : "No"]) },
      { title: "Open Issues", headers: ["Area", "Customer", "Description", "Owner", "ETA", "Critical"],
        rows: openIssues.map(i => [i.area, i.customer, i.description, i.owner, i.eta, i.critical ? "Yes" : "No"]) },
    ]);
  })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
