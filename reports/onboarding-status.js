"use strict";
// reports/onboarding-status.js — Customer Onboarding Status Report generator
// Usage: node reports/onboarding-status.js <path-to-metrics.json>
// Output: out/Onboarding_Status_<CustomerSlug>_<Date>.docx
const T = require("../lib/report-theme");
const { copyToDesktop } = require("../lib/copy-to-desktop");
const { writeCsv } = require("../lib/csv-export");
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

const REQUIRED = ["customer", "customerSlug", "generated", "preparedBy",
                  "kpis", "contactInfo", "timeline", "asanaTasks", "methodology"];
const missing = REQUIRED.filter(k => d[k] == null);
if (missing.length) {
  console.error(`Missing required fields in metrics JSON: ${missing.join(", ")}`);
  process.exit(1);
}

const outDir = path.resolve(__dirname, "../out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const dateSlug = (d.generated || "")
  .replace(/[^0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown";
const outFile = path.join(outDir, `Onboarding_Status_${d.customerSlug}_${dateSlug}.docx`);

const tl = d.timeline || {};
const tasks = d.asanaTasks || [];
const completedTasks = tasks.filter(t => t.completed);
const openTasks      = tasks.filter(t => !t.completed);

// Pre-build timeline rows so they're reusable in the CSV section below
const timelineRows = [
  ["Onboarding Start",  tl.startDate    || "—", "Started"],
  ["Target Go-Live",    tl.targetGoLive || "TBD", tl.goLiveStatus || "In Progress"],
];
if (tl.daysInOnboarding != null) timelineRows.push(["Days Active",     String(tl.daysInOnboarding), "—"]);
if (tl.daysToGoLive     != null) timelineRows.push(["Days Remaining",  String(tl.daysToGoLive),     tl.daysToGoLive > 0 ? "On Track" : "Past Due"]);

const dateRange = d.dateRange || `${tl.startDate || "—"} – ${tl.targetGoLive || "TBD"}`;

const children = [];

// Cover
children.push(T.titleBanner({
  eyebrow: "CUSTOMER SUCCESS  ·  ONBOARDING STATUS",
  title:   `Onboarding Status — ${d.customer}`,
  subtitle: [
    { text: dateRange + "  ", color: "C7D0DD" },
    { text: "· " + d.generated, color: "8FB8BA", bold: true },
  ],
}));
children.push(T.metaStrip(`Prepared ${d.generated} · ${d.preparedBy}`, "CUSTOMER SHARED"));
children.push(T.gap(320));
children.push(T.kpiStrip(d.kpis));
children.push(T.gap(100));

// Contact Directory
// columns: Name | Role | Email | Phone
// widths:  [2400, 1800, 3360, 1800] = 9360
children.push(...T.sectionHead("Contact Directory"));
children.push(T.dataTable({
  columnWidths: [2400, 1800, 3360, 1800],
  header: ["Name", "Role", "Email", "Phone"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
          T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: d.contactInfo.map(c => [c.name, c.role, c.email || "—", c.phone || "—"]),
}));
children.push(T.gap(160));

// Onboarding Timeline
// columns: Milestone | Date | Status
// widths:  [4160, 2600, 2600] = 9360
children.push(...T.sectionHead("Onboarding Timeline"));
children.push(T.dataTable({
  columnWidths: [4160, 2600, 2600],
  header: ["Milestone", "Date", "Status"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
  rows: timelineRows,
}));
if (d.milestones && d.milestones.length > 0) {
  children.push(T.gap(60));
  // columns: Task Milestone | Target Date | Status
  // widths:  [4160, 2600, 2600] = 9360
  children.push(T.dataTable({
    columnWidths: [4160, 2600, 2600],
    header: ["Task Milestone", "Target Date", "Status"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: d.milestones.map(m => [m.name, m.date || "—", m.status || "—"]),
  }));
}
children.push(T.gap(160));

// Task Status
children.push(...T.sectionHead("Task Status"));
children.push(T.callout({
  kind: openTasks.length === 0 ? "success" : "neutral",
  tag:  "Progress",
  body: `${completedTasks.length} of ${tasks.length} tasks complete · ${openTasks.length} remaining`,
}));
if (tasks.length > 0) {
  children.push(T.gap(60));
  // columns: Task | Section | Assignee | Due | Status
  // widths:  [3560, 1600, 1600, 1200, 1400] = 9360
  children.push(T.dataTable({
    columnWidths: [3560, 1600, 1600, 1200, 1400],
    header: ["Task", "Section", "Assignee", "Due", "Status"],
    align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT,
            T.AlignmentType.LEFT, T.AlignmentType.CENTER, T.AlignmentType.CENTER],
    rows: tasks.map(t => [
      t.task || t.name || "—",
      t.section || "—",
      t.assignee || "—",
      t.dueDate || t.due_date || "—",
      t.completed ? "✓ Done" : (t.status || "Open"),
    ]),
  }));
}
children.push(T.gap(160));

// Recent Email Activity (optional)
if (d.recentEmails && d.recentEmails.length > 0) {
  // columns: Date | Subject | From | Direction
  // widths:  [1200, 4360, 2400, 1400] = 9360
  children.push(...T.sectionHead("Recent Email Activity"));
  children.push(T.dataTable({
    columnWidths: [1200, 4360, 2400, 1400],
    header: ["Date", "Subject", "From", "Direction"],
    align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT,
            T.AlignmentType.LEFT, T.AlignmentType.CENTER],
    rows: d.recentEmails.map(e => [e.date, e.subject, e.from, e.direction || "—"]),
  }));
  children.push(T.gap(160));
}

// Upcoming Meetings (optional)
if (d.upcomingMeetings && d.upcomingMeetings.length > 0) {
  // columns: Date | Time | Meeting | Attendees
  // widths:  [1200, 1200, 3760, 3200] = 9360
  children.push(...T.sectionHead("Upcoming Meetings"));
  children.push(T.dataTable({
    columnWidths: [1200, 1200, 3760, 3200],
    header: ["Date", "Time", "Meeting", "Attendees"],
    align: [T.AlignmentType.CENTER, T.AlignmentType.CENTER,
            T.AlignmentType.LEFT, T.AlignmentType.LEFT],
    rows: d.upcomingMeetings.map(m => [m.date, m.time || "—", m.title, m.attendees || "—"]),
  }));
  children.push(T.gap(160));
}

// Open Items & Follow-ups (optional)
if (d.openItems && d.openItems.length > 0) {
  children.push(...T.sectionHead("Open Items & Follow-ups"));
  const urgentItems = d.openItems.filter(i => i.urgent);
  const normalItems = d.openItems.filter(i => !i.urgent);
  for (const i of urgentItems) {
    children.push(T.callout({
      kind: "warn",
      tag:  `🔴 ${i.owner || "Action Required"}`,
      body: `${i.item}${i.due ? "  ·  Due: " + i.due : ""}`,
    }));
    children.push(T.gap(60));
  }
  if (normalItems.length > 0) {
    // columns: Flag | Item | Owner | Due
    // widths:  [800, 4760, 2400, 1400] = 9360
    children.push(T.dataTable({
      columnWidths: [800, 4760, 2400, 1400],
      header: ["", "Item", "Owner", "Due"],
      align: [T.AlignmentType.CENTER, T.AlignmentType.LEFT,
              T.AlignmentType.LEFT, T.AlignmentType.CENTER],
      rows: normalItems.map(i => ["🟡", i.item, i.owner || "—", i.due || "—"]),
    }));
  }
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
  `# Onboarding Status — ${d.customer}`,
  `# Generated ${d.generated}`,
  "",
  `# Sources: ${(d.methodology.sources || []).join(", ")}`,
  `# Period: ${d.methodology.period}`,
  "",
  "# Mountain Time (America/Denver) for all timestamps",
]));
children.push(T.gap(120));
children.push(T.dataTable({
  columnWidths: [2800, 6560],
  header: ["Item", "Detail"],
  align: [T.AlignmentType.LEFT, T.AlignmentType.LEFT],
  rows: [
    ["Customer",     d.customer],
    ["Period",       d.methodology.period],
    ["Data sources", (d.methodology.sources || []).join(", ")],
    ["Time zone",    "Mountain Time (America/Denver)"],
    ["Prepared by",  d.preparedBy],
    ["Generated",    d.generated],
  ],
}));

const doc = T.buildDocument({ children, headerRight: `Onboarding Status — ${d.customer}` });
T.render(doc, outFile)
  .then(() => {
    console.log(`✓ ${outFile}`);
    copyToDesktop(outFile, "Onboarding", "Status");
    writeCsv(outFile.replace(".docx", ".csv"), [
      { title: "Contacts",
        headers: ["Name", "Role", "Email", "Phone"],
        rows: d.contactInfo.map(c => [c.name, c.role, c.email || "", c.phone || ""]) },
      { title: "Timeline",
        headers: ["Milestone", "Date", "Status"],
        rows: timelineRows },
      { title: "Tasks",
        headers: ["Task", "Section", "Assignee", "Due", "Status"],
        rows: tasks.map(t => [
          t.task || t.name || "",
          t.section || "",
          t.assignee || "",
          t.dueDate || t.due_date || "",
          t.completed ? "Done" : (t.status || "Open"),
        ]) },
      { title: "Open Items",
        headers: ["Item", "Owner", "Due", "Urgent"],
        rows: (d.openItems || []).map(i => [i.item, i.owner || "", i.due || "", i.urgent ? "Yes" : "No"]) },
    ]);
  })
  .catch(err => { console.error(`Error writing report: ${err.message}`); process.exit(1); });
