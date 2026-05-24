"use strict";
// reports/intercom-weekly.js — Weekly Intercom report generator
// Usage: node reports/intercom-weekly.js <path-to-metrics.json>
// Output: out/Intercom_Weekly_YYYY-MM-DD.docx  (Monday date via d.weekStartDate)
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir, dateSlug } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "summaryTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

const slug = (d.weekStartDate && /^\d{4}-\d{2}-\d{2}$/.test(d.weekStartDate))
  ? d.weekStartDate
  : dateSlug(d.generated);
const outFile = path.join(outDir, `Intercom_Weekly_${slug}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS INTELLIGENCE",
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
children.push(...T.sectionHead("Executive Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", "This Week", d.priorPeriod || "Last Week", "Change"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summaryTable,
}));
children.push(T.gap(120));

if (d.mtdContext) {
  children.push(T.callout({ kind: "neutral", tag: "Month-to-Date", body: d.mtdContext }));
  children.push(T.gap(100));
}

// Day-by-Day
if (d.dailyTable && d.dailyTable.length > 0) {
  // columns: Day, This Week, Last Week, Delta
  // widths:  [2400, 2320, 2320, 2320] = 9360
  children.push(...T.sectionHead("Day-by-Day Volume"));
  children.push(T.dataTable({
    columnWidths: [2400, 2320, 2320, 2320],
    header: ["Day", "This Week", "Last Week", "Δ"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: d.dailyTable,
  }));
  children.push(T.gap(160));
}

// Customer Activity
children.push(...T.sectionHead("Customer Activity"));
children.push(T.dataTable({
  columnWidths: [780, 5580, 3000],
  header: ["Rank", "Domain", "Conversations"],
  align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
  rows: d.topCustomers,
}));
children.push(T.gap(160));

// Open Ticket Queue
children.push(...T.sectionHead("Open Ticket Queue"));
const urgent = (d.openQueue || []).filter(q => q.urgent);
const normal  = (d.openQueue || []).filter(q => !q.urgent);

if (!d.openQueue || d.openQueue.length === 0) {
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "No open conversations." }));
} else {
  for (const q of urgent) {
    children.push(T.callout({ kind: "warn", tag: `🔴 Urgent — ${q.customer}`, body: `${q.subject}  ·  Open ${q.age}` }));
    children.push(T.gap(60));
  }
  if (normal.length > 0) {
    children.push(T.dataTable({
      columnWidths: [2760, 4800, 1200, 600],
      header: ["Customer", "Subject", "Age", ""],
      align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
      rows: normal.map(q => [q.customer, q.subject, q.age, ""]),
    }));
  }
}
children.push(T.gap(160));

// How This Report Is Built
children.push(T.pageBreak());
children.push(...T.sectionHead("How This Report Is Built"));
children.push(T.subHead("Data Sources & Methodology"));
children.push(T.codeBlock([
  `# Intercom Weekly Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "search_conversations(created_at >= EARLIEST_TS, per_page=150)",
  `# Pages fetched: ${d.methodology.pages}`,
  `# Conversations in window: ${d.methodology.conversations}`,
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

const doc = T.buildDocument({ children, headerRight: `Weekly Report — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Intercom",
  label: "Weekly",
  csvSections: [
      { title: "Summary", headers: ["Metric", "This Week", d.priorPeriod || "Last Week", "Change"], rows: d.summaryTable || [] },
      { title: "Day-by-Day", headers: ["Day", "This Week", "Last Week", "Δ"], rows: d.dailyTable || [] },
      { title: "Top Customers", headers: ["Rank", "Domain", "Conversations"], rows: d.topCustomers || [] },
      { title: "Open Queue", headers: ["Customer", "Subject", "Age", "Urgent"],
        rows: (d.openQueue || []).map(q => [q.customer, q.subject, q.age, q.urgent ? "Yes" : "No"]) },
    ],
});
