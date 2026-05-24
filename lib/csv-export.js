"use strict";
// Writes a multi-section CSV file alongside a generated report.
// Sections are separated by a blank line; each gets a # Title row.
// Passing textContent + contentMimeType:"text/csv" to the Google Drive MCP
// create_file tool auto-converts the result to a native Google Sheet.
const fs = require("fs");

function escapeCsv(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * @param {string} filepath  Absolute path for the .csv output
 * @param {Array<{title?:string, headers?:string[], rows:Array<string[]>}>} sections
 */
function writeCsv(filepath, sections) {
  const lines = [];
  for (const sec of sections) {
    if (lines.length > 0) lines.push("");
    if (sec.title)   lines.push(`# ${sec.title}`);
    if (sec.headers) lines.push(sec.headers.map(escapeCsv).join(","));
    for (const row of (sec.rows || [])) {
      lines.push(row.map(escapeCsv).join(","));
    }
  }
  try {
    fs.writeFileSync(filepath, lines.join("\n"), "utf8");
    console.log(`  → CSV: ${filepath}`);
  } catch (_) {
    // never fatal
  }
}

module.exports = { writeCsv };
