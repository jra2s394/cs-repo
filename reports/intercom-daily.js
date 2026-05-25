"use strict";
// reports/intercom-daily.js — Daily Intercom snapshot generator
// Usage: node reports/intercom-daily.js <path-to-metrics.json>
// Output: out/Intercom_Daily_YYYY-MM-DD.docx  (via d.dateSlug, e.g. "2026-05-21")
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir, dateSlug } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "summaryTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

const slug = d.dateSlug || dateSlug(d.generated);
const outFile = path.join(outDir, `Intercom_Daily_${slug}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:    "CUSTOMER SUCCESS INTELLIGENCE",
  title:      `Daily Snapshot — ${d.period}`,
  dateRange:  d.dateRange,
  generated:  d.generated,
  preparedBy: d.preparedBy,
  kpis:       d.kpis,
}));

// Daily Summary
children.push(...T.sectionHead("Daily Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", "Today", d.priorPeriod || "Yesterday", "Change"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summaryTable,
}));
children.push(T.gap(120));

if (d.weekContext) {
  children.push(T.callout({ kind: "neutral", tag: "Week-to-Date", body: d.weekContext }));
  children.push(T.gap(100));
}

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
  `# Intercom Daily Snapshot — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "search_conversations(created_at >= WEEK_START_TS, per_page=150)",
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
    ["Data source",   "Intercom API (search_conversations)"],
    ["Period",        d.methodology.period],
    ["Conversations", String(d.methodology.conversations)],
    ["Pages fetched", String(d.methodology.pages)],
    ["Time zone",     "Mountain Time (America/Denver)"],
    ["Prepared by",   d.preparedBy],
    ["Generated",     d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Daily Snapshot — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Intercom",
  label: "Daily",
  csvSections: [
      { title: "Summary", headers: ["Metric", "Today", d.priorPeriod || "Yesterday", "Change"], rows: d.summaryTable || [] },
      { title: "Open Queue", headers: ["Customer", "Subject", "Age", "Urgent"],
        rows: (d.openQueue || []).map(q => [q.customer, q.subject, q.age, q.urgent ? "Yes" : "No"]) },
    ],
});
