"use strict";
// reports/qbr.js — QBR prep brief generator
// Usage: node reports/qbr.js <path-to-metrics.json>
// Output: out/QBR_<CustomerSlug>_<Quarter>_<Date>.docx
const T = require("../lib/report-theme");
const { loadJson, requireFields, ensureOutDir, dateSlug } = require("../lib/data-loader");
const path = require("path");

const d = loadJson("metrics");
const REQUIRED = ["customer", "customerSlug", "quarter", "generated", "preparedBy",
                  "kpis", "executiveSummary", "wins", "openIssues", "renewal",
                  "agenda", "nextSteps", "methodology"];
requireFields(d, REQUIRED);

const outDir = ensureOutDir();

const slug = dateSlug(d.generated);
const quarterSlug = (d.quarter || "").replace(/\s+/g, "-");
const outFile = path.join(outDir, `QBR_${d.customerSlug}_${quarterSlug}_${slug}.docx`);

const children = [];

// Cover
children.push(...T.coverBlock({
  eyebrow:    "CUSTOMER SUCCESS  ·  QUARTERLY BUSINESS REVIEW",
  title:      `${d.customer} — ${d.quarter}`,
  dateRange:  d.dateRange || d.quarter,
  generated:  d.generated,
  preparedBy: d.preparedBy,
  kpis:       d.kpis,
}));

// Meeting Details
children.push(...T.sectionHead("Meeting Details"));
const meetingRows = [];
if (d.meetingDate) meetingRows.push(["Meeting Date", d.meetingDate]);
if (d.attendeesCustomer) meetingRows.push([`Attendees — ${d.customer}`, d.attendeesCustomer]);
if (d.attendeesSlabstack) meetingRows.push(["Attendees — Slabstack", d.attendeesSlabstack]);
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: meetingRows,
}));
children.push(T.gap(160));

// Executive Summary
// columns: Metric | Value
// widths:  [3000, 6360] = 9360
children.push(...T.sectionHead("Executive Summary"));
children.push(T.dataTable({
  columnWidths: [3000, 6360],
  header: ["Metric", "Value"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: d.executiveSummary || [],
}));
children.push(T.gap(160));

// Quarter Wins
// columns: Win | Impact | Source
// widths:  [3360, 3200, 2800] = 9360
children.push(...T.sectionHead("Quarter Wins"));
if (!d.wins || d.wins.length === 0) {
  children.push(T.callout({ kind: "warn", tag: "No wins recorded", body: "No confirmed wins were sourced for this period — review Intercom, Gmail, and Calendar for evidence." }));
} else {
  children.push(T.dataTable({
    columnWidths: [3360, 3200, 2800],
    header: ["Win", "Impact", "Source"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT, T.AlignmentType.LEFT],
    rows: d.wins.map(w => [w.win, w.impact, w.source]),
  }));
}
children.push(T.gap(160));

// Open Issues
children.push(...T.sectionHead("Open Issues"));
if (!d.openIssues || d.openIssues.length === 0) {
  children.push(T.callout({ kind: "success", tag: "All Clear", body: "No open issues heading into this QBR." }));
} else {
  const critical = d.openIssues.filter(i => i.critical);
  const normal   = d.openIssues.filter(i => !i.critical);
  for (const i of critical) {
    children.push(T.callout({ kind: "warn", tag: `🔴 ${i.issue}`, body: `Owner: ${i.owner || "—"}  ·  ETA: ${i.eta || "—"}  ·  Status: ${i.status || "—"}` }));
    children.push(T.gap(60));
  }
  if (normal.length > 0) {
    // columns: Issue | Status | Owner | ETA
    // widths:  [3360, 2000, 2200, 1800] = 9360
    children.push(T.dataTable({
      columnWidths: [3360, 2000, 2200, 1800],
      header: ["Issue", "Status", "Owner", "ETA"],
      align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
      rows: normal.map(i => [i.issue, i.status || "—", i.owner || "—", i.eta || "—"]),
    }));
  }
}
children.push(T.gap(160));

// Renewal
children.push(...T.sectionHead("Renewal"));
const renewalRows = [];
const r = d.renewal || {};
if (r.date)              renewalRows.push(["Renewal Date",  r.date]);
if (r.daysOut != null)   renewalRows.push(["Days to Renewal", String(r.daysOut)]);
if (r.currentARR)        renewalRows.push(["Current ARR",   r.currentARR]);
if (r.risk)              renewalRows.push(["Risk Level",    r.risk]);
if (r.strategy)          renewalRows.push(["Strategy",      r.strategy]);
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: renewalRows,
}));
children.push(T.gap(160));

// Agenda
// columns: Section | Time | Owner
// widths:  [5160, 2000, 2200] = 9360
children.push(...T.sectionHead("Meeting Agenda"));
children.push(T.dataTable({
  columnWidths: [5160, 2000, 2200],
  header: ["Section", "Time", "Owner"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: d.agenda || [],
}));
children.push(T.gap(160));

// Next Steps
// columns: Action | Owner | Due
// widths:  [4760, 2600, 2000] = 9360
children.push(...T.sectionHead("Next Steps"));
children.push(T.dataTable({
  columnWidths: [4760, 2600, 2000],
  header: ["Action", "Owner", "Due"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT, T.AlignmentType.CENTER],
  rows: (d.nextSteps || []).map(s => [s.action, s.owner, s.due]),
}));
children.push(T.gap(160));

// Methodology
children.push(T.pageBreak());
children.push(...T.sectionHead("How This Report Is Built"));
children.push(T.subHead("Data Sources & Methodology"));
children.push(T.codeBlock([
  `# QBR — ${d.customer} — ${d.quarter}`,
  `# Generated ${d.generated}`,
  "",
  `# Period: ${d.methodology.period}`,
  `# Sources: ${(d.methodology.sources || []).join(", ")}`,
  "",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Customer",    d.customer],
    ["Quarter",     d.quarter],
    ["Period",      d.methodology.period],
    ["Data sources",(d.methodology.sources || []).join(", ")],
    ["Time zone",   "Mountain Time (America/Denver)"],
    ["Prepared by", d.preparedBy],
    ["Generated",   d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `QBR — ${d.customer} — ${d.quarter}` });
T.publishReport(doc, outFile, {
  category: "QBR",
  label: `${d.customerSlug}_${quarterSlug}`,
  csvSections: [
    { title: "Wins", headers: ["Win", "Impact", "Source"],
      rows: (d.wins || []).map(w => [w.win, w.impact, w.source]) },
    { title: "Open Issues", headers: ["Issue", "Status", "Owner", "ETA", "Critical"],
      rows: (d.openIssues || []).map(i => [i.issue, i.status, i.owner, i.eta, i.critical ? "Yes" : "No"]) },
    { title: "Agenda", headers: ["Section", "Time", "Owner"], rows: d.agenda || [] },
    { title: "Next Steps", headers: ["Action", "Owner", "Due"],
      rows: (d.nextSteps || []).map(s => [s.action, s.owner, s.due]) },
  ],
});
