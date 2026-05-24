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

// Convert a generated timestamp (or any string) to a YYYY-MM-DD-style date slug
// suitable for filenames. Strips everything except digits, then collapses runs
// of "-" and trims edge dashes. Empty/falsy input → "unknown-date".
function dateSlug(s) {
  return (s || "").replace(/[^0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "unknown-date";
}

module.exports = { loadJson, requireFields, ensureOutDir, dateSlug };
