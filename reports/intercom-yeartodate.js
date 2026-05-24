"use strict";
// reports/intercom-yeartodate.js — YTD/Annual Intercom report generator
// Usage: node reports/intercom-yeartodate.js <path-to-metrics.json>
// Output: out/Intercom_YTD_YYYY.docx
const T = require("../lib/report-theme");
const { copyToDesktop } = require("../lib/copy-to-desktop");
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
const REQUIRED = ["generated", "period", "dateRange", "preparedBy", "kpis", "multiYearTable", "allTimeStats", "methodology"];
const missing = REQUIRED.filter(k => d[k] == null);
if (missing.length) {
  console.error(`Missing required fields in metrics JSON: ${missing.join(", ")}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, "../out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Period: "2026 YTD" → year slug "2026"
const periodParts = d.period ? d.period.split(" ") : [];
if (periodParts.length < 2) {
  console.error(`Invalid period format: "${d.period}". Expected "YYYY YTD" (e.g. "2026 YTD")`);
  process.exit(1);
}
const yr = periodParts[0];
const outFile = path.join(outDir, `Intercom_YTD_${yr}.docx`);

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS INTELLIGENCE",
  title:   `YTD Support Intelligence — ${yr}`,
  subtitle: [
    { text: d.dateRange + "  ", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "CONFIDENTIAL"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Multi-Year Overview
// columns: Year, Conversations, Closed, Res%, Avg FRT, Reopen%, Contacts, Domains
// widths:  [1200, 1680, 1080, 1080, 1080, 1080, 1080, 1080] = 9360
children.push(...T.sectionHead("Multi-Year Overview"));
children.push(T.dataTable({
  columnWidths: [1200, 1680, 1080, 1080, 1080, 1080, 1080, 1080],
  header: ["Year", "Conversations", "Closed", "Res%", "Avg FRT", "Reopen%", "Contacts", "Domains"],
  align: [
    T.AlignmentType.LEFT,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    T.AlignmentType.CENTER,
  ],
  rows: d.multiYearTable,
}));
children.push(T.gap(80));
children.push(T.para(`* ${yr} YTD = Jan 1 – ${d.generated} (partial year)`, {
  size: 17, color: T.COLORS.grayTx, italics: true,
}));
children.push(T.gap(160));

// Quarter-by-Quarter
// columns: Quarter, New, Closed, Resolution, Avg FRT, Avg Close, Fin%
// widths:  [1200, 1200, 1200, 1560, 1500, 1500, 1200] = 9360
children.push(...T.sectionHead(`Quarter-by-Quarter (${yr})`));
children.push(T.dataTable({
  columnWidths: [1200, 1200, 1200, 1560, 1500, 1500, 1200],
  header: ["Quarter", "New", "Closed", "Resolution", "Avg FRT", "Avg Close", "Fin%"],
  align: [
    T.AlignmentType.LEFT,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
  ],
  rows: d.quarterlyTable,
}));
children.push(T.gap(160));

// All-Time Totals
const at = d.allTimeStats || {};
children.push(...T.sectionHead("All-Time Totals"));
children.push(T.callout({
  kind: "neutral",
  tag: "All-Time Snapshot",
  body: `${at.conversations} conversations  ·  ${at.resolutionRate} resolution  ·  ${at.contacts} contacts  ·  ${at.domains} domains`,
}));
children.push(T.gap(100));
children.push(T.dataTable({
  columnWidths: [3000, 6360],
  header: ["Metric", "Value"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Total conversations ever",  at.conversations],
    ["Total closed",              at.closed],
    ["Overall resolution rate",   at.resolutionRate],
    ["Unique contacts (users)",   at.contacts],
    ["Unique tenants (domains)",  at.domains],
    ["KB articles (published)",   at.kbArticles],
    ["Fin AI participation",      at.finParticipation],
    ["Oldest conversation",       at.oldestConversation],
    ["Top customer all-time",     at.topCustomerAllTime],
  ],
}));
children.push(T.gap(160));

// Top Customers All-Time
// columns: Rank, Domain, All-Time, YTD, Active?
// widths:  [480, 3360, 1680, 1680, 2160] = 9360
children.push(T.pageBreak());
children.push(...T.sectionHead("Top Customers All-Time"));
children.push(T.dataTable({
  columnWidths: [480, 3360, 1680, 1680, 2160],
  header: ["Rank", "Domain", "All-Time", `YTD ${yr}`, "Active?"],
  align: [
    T.AlignmentType.CENTER, T.AlignmentType.LEFT,
    T.AlignmentType.CENTER, T.AlignmentType.CENTER, T.AlignmentType.CENTER,
  ],
  rows: d.topCustomers,
}));
children.push(T.gap(160));

// Fin AI Adoption
if (d.finAdoptionTable && d.finAdoptionTable.length > 0) {
  children.push(...T.sectionHead("Fin AI Adoption"));
  // columns: Period, Sessions, Resolved, Escalated, % of Convs
  // widths:  [1680, 1680, 1680, 1680, 2640] = 9360
  children.push(T.dataTable({
    columnWidths: [1680, 1680, 1680, 1680, 2640],
    header: ["Period", "Sessions", "Resolved", "Escalated", "% of Convs"],
    align: [
      T.AlignmentType.LEFT,
      T.AlignmentType.CENTER, T.AlignmentType.CENTER,
      T.AlignmentType.CENTER, T.AlignmentType.CENTER,
    ],
    rows: d.finAdoptionTable,
  }));
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
  `# Intercom YTD Report — ${d.period}`,
  `# Generated ${d.generated}`,
  "",
  "search_conversations(created_at >= JAN_1_2024_TS, per_page=150)  # paginated",
  `# Pages fetched: ${d.methodology.pages}`,
  `# Total conversations processed: ${d.methodology.conversations}`,
  `# All-time window: ${d.methodology.period}`,
  "",
  "# Results bucketed in Python by created_at timestamp per year/quarter",
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

const doc = T.buildDocument({ children, headerRight: `YTD Intelligence — ${yr}` });
T.render(doc, outFile)
  .then(() => { console.log(`✓ ${outFile}`); copyToDesktop(outFile, "Intercom", "YTD"); })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
