"use strict";
/**
 * Minimal valid metrics-JSON fixtures for every report in reports/*.js.
 *
 * Goal: each fixture satisfies the report's `requireFields()` check and
 * supplies enough structure that the report renders to .docx without
 * crashing. These are NOT representative of real data — they exist so a
 * positive end-to-end test can catch regressions like "I renamed a field
 * and now half the reports throw at render time."
 *
 * Each entry maps `<reportBasename>` → fixture object.
 */

// Shared building blocks
const KPIS = [
  { value: "42", label: "Sample KPI", delta: "▲ 5%" },
  { value: "99%", label: "Resolution", delta: "▲ 1pt" },
];

const METHODOLOGY = {
  sources: ["Intercom", "Asana"],
  period: "May 1 – May 26, 2026",
  pages: 1,
  conversations: 100,
  rowsProcessed: 50,
  asanaTasks: 10,
};

const COMMON = {
  generated:  "May 26, 2026",
  period:     "May 2026",
  dateRange:  "May 1 – May 26, 2026",
  preparedBy: "Test User",
  kpis:       KPIS,
  methodology: METHODOLOGY,
  priorPeriod: "April 2026",
};

const SUMMARY_TABLE = [
  ["Conversations", "100", "80", "▲ 25%"],
  ["Closed",        "90",  "70", "▲ 28%"],
];

const SCORECARD_TABLE = [
  ["CARR Completed", "$100k", "$80k", "▲ 25%", "▲ 10%"],
];

// Optional-section fixtures. Round 70 added these to push branch coverage:
// many reports have `if (d.optionalField && d.optionalField.length > 0)`
// blocks that only render when the field is populated. Passing empty
// arrays everywhere meant the smoke test only exercised the "skip
// section" branch. These let fixtures exercise the "render section"
// branch too — shapes match the per-report render code.
const RECS = [
  // tagColor is a hex string (no #) per lib/report-theme.js COLORS palette.
  // 9C6B14 = amber, 2C3E63 = navySoft. These match the kinds report-theme
  // calls "warn" and "neutral" respectively.
  { num: 1, title: "Schedule QBR with Acme", tag: "URGENT", tagColor: "9C6B14", body: "Set up the Q3 review meeting." },
  { num: 2, title: "Follow up on integration blocker", tag: "NORMAL", tagColor: "2C3E63", body: "Email contact about next steps." },
];

const ATRISK = [
  { customer: "Acme Co", issue: "Integration blocker", owner: "Alice", action: "Follow up by EOW", critical: true },
];

const UPCOMING_RENEWALS = [
  { customer: "Acme Co", renewalDate: "Aug 1, 2026", daysOut: 67, arr: "$50k", risk: "Low" },
];

const UPCOMING_EVENTS = [
  { date: "May 30", customer: "Acme Co", event: "QBR", owner: "Test User" },
];

const TOP_CUSTOMERS = [["Acme Co", "12", "10"]];
const OPEN_QUEUE = [["Acme Co", "Integration question", "5d", "Alice"]];
const FIN_ADOPTION = [["May 2026", "85%", "+3pt"]];

module.exports = {
  // ── Intercom reports ─────────────────────────────────────────────────────
  "intercom-daily.js": {
    ...COMMON,
    dateSlug: "2026-05-26",
    summaryTable: SUMMARY_TABLE,
    openQueue: [],
    weekContext: "Week-to-date: 18 conversations",
  },

  "intercom-weekly.js": {
    ...COMMON,
    weekStartDate: "2026-05-19",
    summaryTable: SUMMARY_TABLE,
    dailyTable: [["Monday", "10", "8", "+2"]],
    topCustomers: TOP_CUSTOMERS,
    openQueue: OPEN_QUEUE,
    mtdContext: "MTD: 88 conversations",
  },

  "intercom-monthly.js": {
    ...COMMON,
    summaryTable: SUMMARY_TABLE,
    weeklyTable: [["May 1–7", "20", "18", "90%", "5m"]],
    topCustomers: TOP_CUSTOMERS,
    openQueue: OPEN_QUEUE,
    qtdContext: "Q2 2026: 230 conversations",
    ytdContext: "YTD 2026: 572 conversations",
    recs: RECS,
  },

  "intercom-quarterly.js": {
    ...COMMON,
    period: "Q2 2026",
    dateRange: "Apr 1 – Jun 30, 2026",
    scorecardTable: [["Conversations", "300", "250", "▲ 20%", "▲ 5%"]],
    monthlyTable: [["April", "100", "90", "90%", "5m", "10%"]],
    topCustomers: [],
    ytdContext: "YTD 2026: 572 conversations",
    recs: RECS,
  },

  "intercom-yeartodate.js": {
    ...COMMON,
    period: "2026 YTD",
    dateRange: "Jan 1 – May 26, 2026",
    multiYearTable: [["2026 YTD", "572", "560", "98%", "5m", "2%", "300", "40"]],
    quarterlyTable: [["Q1 2026", "150", "145", "97%", "4m", "1h", "15%"]],
    allTimeStats: {
      conversations: "1500",
      closed: "1450",
      resolutionRate: "97%",
      contacts: "300",
      domains: "40",
      kbArticles: "25",
      finParticipation: "12%",
      oldestConversation: "Jan 1, 2024",
      topCustomerAllTime: "example.com (50 convs)",
    },
    topCustomers: [],
    finAdoptionTable: FIN_ADOPTION,
    recs: RECS,
  },

  // ── Onboarding reports ───────────────────────────────────────────────────
  "onboarding-weekly.js": {
    ...COMMON,
    sourceFile: "mastersheet.xlsx",
    summaryTable: SUMMARY_TABLE,
    accountsTable: [["Acme Co", "Core", "$10k", "In-Flight", "30d"]],
    carrBacklog: "—",
  },

  "onboarding-monthly.js": {
    ...COMMON,
    sourceFile: "mastersheet.xlsx",
    summaryTable: SUMMARY_TABLE,
    accountsTable: [["Acme Co", "Core", "$10k", "Completed", "May 1"]],
    weeklyTable: [["Week 1", "5", "3", "$25k", "$15k"]],
    carrBacklog: "—",
  },

  "onboarding-quarterly.js": {
    ...COMMON,
    period: "Q2 2026",
    dateRange: "Apr 1 – Jun 30, 2026",
    sourceFile: "mastersheet.xlsx",
    scorecardTable: SCORECARD_TABLE,
    monthlyTable: [["April 2026", "5", "3", "$25k", "$15k"]],
    accountsTable: [["Acme Co", "Core", "$25k", "In-Flight", "30d"]],
    ytdContext: "YTD 2026: $250k onboarded",
    atRisk: ATRISK,
    backlogTable: [["Acme Co", "Integration", "$50k"]],
    recs: RECS,
    carrBacklog: "$120k",
  },

  "onboarding-yearly.js": {
    ...COMMON,
    period: "2026 YTD",
    dateRange: "Jan 1 – May 26, 2026",
    sourceFile: "mastersheet.xlsx",
    multiYearTable: [["2026*", "20", "15", "$150k", "$80k", "45d"]],
    allTimeStats: {
      accountsCompleted: "100",
      carrOnboarded: "$1.2M",
      activeAccounts: "12",
      carrInFlight: "$120k",
      avgDaysToGoLive: "42d",
      fastestGoLive: "14d",
      longestGoLive: "120d",
      topByCarr: "Example Co — $50k",
    },
    quarterlyTable: [["Q1 2026", "8", "6", "$60k", "—"]],
    topAccountsTable: [["1", "Example Co", "Core", "$50k", "Completed"]],
    carrBacklog: "—",
  },

  "onboarding-status.js": {
    customer:     "Acme Co",
    customerSlug: "Acme",
    generated:    "May 26, 2026",
    preparedBy:   "Test User",
    kpis:         KPIS,
    contactInfo:  [
      { name: "Alice", role: "CSM", email: "alice@example.com", phone: "" },
    ],
    timeline: {
      startDate: "May 1, 2026",
      targetGoLive: "June 15, 2026",
      daysInOnboarding: 26,
      daysToGoLive: 20,
      goLiveStatus: "On Track",
    },
    asanaTasks: [
      { task: "Configure", section: "Setup", assignee: "Alice", dueDate: "May 30", completed: false },
    ],
    methodology: METHODOLOGY,
  },

  // ── QBR ──────────────────────────────────────────────────────────────────
  "qbr.js": {
    customer:     "Acme Co",
    customerSlug: "Acme",
    quarter:      "Q2 2026",
    generated:    "May 26, 2026",
    preparedBy:   "Test User",
    kpis:         KPIS,
    executiveSummary: [["Metric", "Value"], ["NPS", "9"]],
    wins:         [{ win: "Launched", impact: "High", source: "Email 5/20" }],
    openIssues:   [{ issue: "Integration blocker", impact: "Medium", status: "Active" }],
    renewal: {
      date: "Aug 1, 2026",
      daysOut: 67,
      currentARR: "$50k",
      risk: "Low",
      strategy: "Renew with expansion",
    },
    agenda:       [["Welcome", "5m", "Test User"]],
    nextSteps:    [{ action: "Schedule training", owner: "Alice", due: "Jun 1" }],
    methodology:  METHODOLOGY,
  },

  // ── Renewals reports ─────────────────────────────────────────────────────
  "renewal-health.js": {
    ...COMMON,
    renewals: [
      { customer: "Acme Co", renewalDate: "Aug 1, 2026", daysOut: 67, arr: "$50k", risk: "Low" },
    ],
    summary: [
      ["Next 30 days", "1", "$10k", "On track"],
    ],
  },

  "renewals-thismonth.js": {
    ...COMMON,
    invoiceTable: [["Acme Co", "$10k", "Aug 1, 2026"]],
    summaryTable: [["Total", "1", "$10k"]],
  },

  "renewals-nextmonth.js": {
    ...COMMON,
    invoiceTable: [["Acme Co", "$10k", "Sep 1, 2026"]],
    summaryTable: [["Total", "1", "$10k"]],
  },

  "renewals-nextquarter.js": {
    ...COMMON,
    period: "Q3 2026",
    dateRange: "Jul 1 – Sep 30, 2026",
    summaryTable: [["July", "5", "$50k"]],
    monthlyGroups: [
      { month: "July 2026",   invoiceTable: [["Acme Co", "$10k", "Jul 1, 2026"]], pending: false },
      { month: "August 2026", invoiceTable: [],                                    pending: true },
    ],
    recs: RECS,
  },

  // ── Portfolio reports ────────────────────────────────────────────────────
  "customer-health.js": {
    ...COMMON,
    accounts: [
      { customer: "Acme Co", status: "🟢", carr: "$50k", lastContact: "5d ago" },
    ],
    summary: [
      ["🟢 Green",  "5", "62%"],
      ["🟡 Yellow", "2", "25%"],
      ["🔴 Red",    "1", "13%"],
    ],
    atRisk:           ATRISK,
    upcomingRenewals: UPCOMING_RENEWALS,
    recs:             RECS,
  },

  "executive-summary.js": {
    ...COMMON,
    portfolioMetrics:    [["Active Accounts", "15", "—"]],
    highlights:          [
      { title: "Strong renewal pipeline", body: "$500k in Q3", critical: false },
      { title: "Critical: Acme escalation", body: "Integration blocker", critical: true },
    ],
    openIssues:          [["Acme Co", "Integration", "Alice", "Active"]],
    onboardingSnapshot:  [["Active Accounts", "15"], ["Completed This Quarter", "5"]],
    intercomSnapshot:    [["Open Conversations", "12"], ["Avg Response", "5m"]],
    upcomingEvents:      UPCOMING_EVENTS,
    recs:                RECS,
  },
};
