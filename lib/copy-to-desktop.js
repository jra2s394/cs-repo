"use strict";
// Copies a generated report to ~/Desktop/CS Reports/<category>/<Label>_Latest.docx
// Non-fatal: silently skips if the Desktop folder doesn't exist or copy fails.
const fs   = require("fs");
const path = require("path");
const os   = require("os");

/**
 * @param {string} srcFile   Absolute path to the .docx that was just written
 * @param {string} category  "Intercom" or "Onboarding"
 * @param {string} label     Short label, e.g. "Weekly", "Monthly", "Daily"
 */
function copyToDesktop(srcFile, category, label) {
  try {
    const destDir = path.join(os.homedir(), "Desktop", "CS Reports", category);
    if (!fs.existsSync(destDir)) return;
    const destFile = path.join(destDir, `${category}_${label}_Latest.docx`);
    fs.copyFileSync(srcFile, destFile);
    console.log(`  → Desktop copy: ${destFile}`);
  } catch (_) {
    // never fatal
  }
}

module.exports = { copyToDesktop };
