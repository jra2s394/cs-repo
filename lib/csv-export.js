"use strict";
// Writes a multi-section CSV file alongside a generated report.
// Sections are separated by a blank line; each gets a # Title row.
// Passing textContent + contentMimeType:"text/csv" to the Google Drive MCP
// create_file tool auto-converts the result to a native Google Sheet.
const fs = require("fs");

// Characters that, when leading a cell, cause Excel and Google Sheets to
// interpret the cell as a formula (`=SUM(...)`, `=HYPERLINK(...)`, etc.).
// Tab and CR are included because some spreadsheet apps strip them and then
// treat the next character as the leading one.
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function escapeCsv(val) {
  if (val == null) return "";
  let s = String(val);

  // Defang spreadsheet formula injection by prefixing risky leads with a
  // single quote. Sheets/Excel strip the leading quote on display but do
  // not evaluate the cell.
  if (s.length > 0 && FORMULA_PREFIXES.includes(s[0])) {
    s = "'" + s;
  }

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
  } catch (err) {
    // Reporting code shouldn't crash a report run on a write failure, but the
    // user needs to see why the CSV didn't land.
    console.error(`  ✗ CSV write failed (${filepath}): ${err.message}`);
  }
}

module.exports = { writeCsv, escapeCsv };
