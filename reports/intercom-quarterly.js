"use strict";
// reports/intercom-quarterly.js — Quarterly Intercom report generator
// Usage: node reports/intercom-quarterly.js <path-to-metrics.json>
// Output: out/Intercom_Quarterly_YYYY-QN.docx  (e.g. Intercom_Quarterly_2026-Q2.docx)
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "scorecardTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

// Period: "Q2 2026" → slug "2026-Q2"
const periodParts = d.period ? d.period.split(" ") : [];
if (periodParts.length < 2) {
  console.error(`Invalid period format: "${d.period}". Expected "QN Year" (e.g. "Q2 2026")`);
  process.exit(1);
}
const [ql, yr] = periodParts;
const outFile = path.join(outDir, `Intercom_Quarterly_${yr}-${ql}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:    "CUSTOMER SUCCESS INTELLIGENCE",
  title:      `${d.period} Quarterly Report`,
  dateRange:  d.dateRange,
  generated:  d.generated,
  preparedBy: d.preparedBy,
  kpis:       d.kpis,
}));

// QoQ Scorecard
// columns: Metric, This Q, Last Q, Change, YoY
// widths:  [2800, 1480, 1480, 1600, 2000] = 9360
children.push(...T.sectionHead("Quarter-over-Quarter Scorecard"));
children.push(T.dataTable({
  columnWidths: [2800, 1480, 1480, 1600, 2000],
  header: ["Metric", d.period, d.priorPeriod || "Last Q", "Change", "YoY"],
  align: [
    T.AlignmentType.LEFT,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER,
  ],
  rows: d.scorecardTable,
}));
children.push(T.gap(160));

// Monthly Breakdown
if (d.monthlyTable && d.monthlyTable.length > 0) {
  // columns: Month, New, Closed, Resolution, Avg FRT, Fin%
  // widths:  [1860, 1260, 1260, 1660, 1660, 1660] = 9360
  children.push(...T.sectionHead(`Monthly Breakdown — ${d.period}`));
  children.push(T.dataTable({
    columnWidths: [1860, 1260, 1260, 1660, 1660, 1660],
    header: ["Month", "New", "Closed", "Resolution", "Avg FRT", "Fin%"],
    align: [
      T.AlignmentType.LEFT,
      T.AlignmentType.CENTER, T.AlignmentType.CENTER,
      T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    ],
    rows: d.monthlyTable,
  }));
  children.push(T.gap(160));
}

// Top Customers
children.push(...T.sectionHead(`Top Customers — ${d.period}`));
children.push(T.dataTable({
  columnWidths: [780, 5580, 3000],
  header: ["Rank", "Domain", "Conversations"],
  align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
  rows: d.topCustomers,
}));
children.push(T.gap(160));

// YTD Context
if (d.ytdContext) {
  children.push(...T.sectionHead("Year-to-Date Summary"));
  children.push(T.callout({ kind: "neutral", tag: "YTD Context", body: d.ytdContext }));
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

// How This Report Is Built
children.push(T.pageBreak());
children.push(...T.sectionHead("How This Report Is Built"));
children.push(T.subHead("Data Sources & Methodology"));
children.push(T.codeBlock([
  `# Intercom Quarterly Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "search_conversations(created_at >= SAME_Q_LAST_YEAR_TS, per_page=150)",
  `# Pages fetched: ${d.methodology.pages}`,
  `# Conversations processed: ${d.methodology.conversations}`,
  `# Window: ${d.methodology.period}`,
  "",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Data source",   "Intercom API (search_conversations, list_articles)"],
    ["Period",        d.methodology.period],
    ["Conversations", String(d.methodology.conversations)],
    ["Pages fetched", String(d.methodology.pages)],
    ["Time zone",     "Mountain Time (America/Denver)"],
    ["Prepared by",   d.preparedBy],
    ["Generated",     d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `${d.period} Quarterly Report` });
T.publishReport(doc, outFile, {
  category: "Intercom",
  label: "Quarterly",
  csvSections: [
      { title: "Summary", headers: ["Metric", d.period, d.priorPeriod || "Last Q", "Change", "YoY"], rows: d.scorecardTable || [] },
      { title: "Monthly Breakdown", headers: ["Month", "New", "Closed", "Resolution", "Avg FRT", "Fin%"], rows: d.monthlyTable || [] },
      { title: "Top Customers", headers: ["Rank", "Domain", "Conversations"], rows: d.topCustomers || [] },
    ],
});
