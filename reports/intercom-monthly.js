"use strict";
// reports/intercom-monthly.js — Monthly Intercom report generator
// Usage: node reports/intercom-monthly.js <path-to-metrics.json>
// Output: out/Intercom_Monthly_YYYY-MM.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "summaryTable", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

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
const outFile = path.join(outDir, `Intercom_Monthly_${yr}-${String(mi + 1).padStart(2, "0")}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS INTELLIGENCE",
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
children.push(...T.sectionHead("Executive Summary"));
children.push(T.dataTable({
  columnWidths: [3360, 1800, 1800, 2400],
  header: ["Metric", d.period, d.priorPeriod || "Prior Period", "Change"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.summaryTable,
}));
children.push(T.gap(120));

if (d.qtdContext || d.ytdContext) {
  children.push(T.callout({
    kind: "neutral",
    tag: "Context",
    body: [d.qtdContext, d.ytdContext].filter(Boolean).join("  ·  "),
  }));
  children.push(T.gap(100));
}

// Week-by-Week
children.push(...T.sectionHead("Week-by-Week Breakdown"));
children.push(T.dataTable({
  columnWidths: [2400, 1490, 1490, 1490, 2490],
  header: ["Week", "New", "Closed", "Resolution", "Avg FRT"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.weeklyTable,
}));
children.push(T.gap(160));

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
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "No open conversations — all resolved." }));
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
  `# Intercom Monthly Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "search_conversations(created_at >= EARLIEST_TS, per_page=150)  # paginated",
  `# Pages fetched: ${d.methodology.pages}`,
  `# Total conversations processed: ${d.methodology.conversations}`,
  `# Data window: ${d.methodology.period}`,
  "",
  "# All metrics computed in Python from raw Intercom API responses",
  "# Mountain Time (America/Denver) applied to all timestamps",
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

const doc = T.buildDocument({ children, headerRight: `Monthly Report — ${d.period}` });
T.publishReport(doc, outFile, {
  category: "Intercom",
  label: "Monthly",
  csvSections: [
      { title: "Summary", headers: ["Metric", d.period, d.priorPeriod || "Prior Month", "Change"], rows: d.summaryTable || [] },
      { title: "Weekly Breakdown", headers: ["Week", "New", "Closed", "Resolution", "Avg FRT"], rows: d.weeklyTable || [] },
      { title: "Top Customers", headers: ["Rank", "Domain", "Conversations"], rows: d.topCustomers || [] },
      { title: "Open Queue", headers: ["Customer", "Subject", "Age", "Urgent"],
        rows: (d.openQueue || []).map(q => [q.customer, q.subject, q.age, q.urgent ? "Yes" : "No"]) },
    ],
});
