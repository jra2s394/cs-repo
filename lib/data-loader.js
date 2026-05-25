"use strict";
// lib/data-loader.js — shared JSON loading / validation for all report scripts
const path = require("path");
const fs   = require("fs");

function loadJson(label) {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error(`Usage: node ${path.basename(process.argv[1])} <path-to-metrics.json>`);
    process.exit(1);
  }
  let d;
  try {
    d = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (err) {
    console.error(`Error loading ${label || "metrics"}: ${err.message}`);
    process.exit(1);
  }
  return d;
}

function requireFields(d, required) {
  const missing = required.filter(k => d[k] == null);
  if (missing.length) {
    console.error(`Missing required fields in metrics JSON: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function ensureOutDir() {
  const outDir = path.resolve(__dirname, "../out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

// Convert a date/timestamp string to a YYYY-MM-DD-style slug suitable for
// filenames.
//
// Two paths, in order:
//   1. If the input contains a multi-letter word (a month name like
//      "May 25, 2026" or a weekday prefix like "Saturday, May 23, 2026"),
//      try Date.parse. On success, return "YYYY-MM-DD". This is the case
//      that previously silently produced garbage ("May 25, 2026" →
//      "25-2026", losing the month entirely).
//   2. Otherwise, fall back to the digit-stripping behavior: replace every
//      non-digit with "-", collapse runs, trim edges. This keeps ISO-style
//      inputs ("2026-05-23T14:32:00") rendering with their full precision
//      ("2026-05-23-14-32-00") — the lone "T" doesn't match {2,}.
//
// Empty / unparseable input → "unknown-date".
function dateSlug(s) {
  s = (s || "").toString();
  if (!s) return "unknown-date";

  if (/[a-zA-Z]{2,}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y   = d.getFullYear();
      const m   = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  return s.replace(/[^0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown-date";
}

module.exports = { loadJson, requireFields, ensureOutDir, dateSlug };
