"use strict";
/**
 * tests/js/test_reports_smoke.js
 * Smoke tests for reports/*.js — verifies the shared CLI contract held by
 * data-loader.js applies to every report consistently:
 *   1. Running with no arg → exit 1, prints "Usage:"
 *   2. Running with a bad path → exit 1, prints "Error loading"
 *   3. Running with an empty {} JSON → exit 1, prints "Missing required fields"
 *
 * Positive end-to-end runs are covered manually against data/outputs/*.json;
 * automating those would require checking docx-js output, which is the job
 * of test_report_theme.js. Here we just guard the CLI contract.
 *
 * Run: node tests/js/test_reports_smoke.js
 */
const assert = require("assert");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const { spawnSync } = require("child_process");

const REPORTS_DIR = path.resolve(__dirname, "../../reports");
const REPORTS = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith(".js"));

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}\n     ${e.message}`);
    failed++;
  }
}

function run(report, ...args) {
  return spawnSync(process.execPath,
    [path.join(REPORTS_DIR, report), ...args],
    { encoding: "utf8" });
}

function tmpJson(obj) {
  const f = path.join(os.tmpdir(),
    `report_smoke_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
}

console.log(`\nfound ${REPORTS.length} report scripts\n`);

console.log("no-arg → exit 1 + Usage message");
for (const r of REPORTS) {
  test(r, () => {
    const res = run(r);
    assert.strictEqual(res.status, 1, `exit ${res.status}, stderr: ${res.stderr}`);
    assert.ok(res.stderr.includes("Usage:"),
      `expected 'Usage:' in stderr, got: ${res.stderr}`);
  });
}

console.log("\nbad path → exit 1 + Error loading message");
for (const r of REPORTS) {
  test(r, () => {
    const res = run(r, "/nonexistent/path/to/metrics.json");
    assert.strictEqual(res.status, 1, `exit ${res.status}, stderr: ${res.stderr}`);
    assert.ok(res.stderr.includes("Error loading"),
      `expected 'Error loading' in stderr, got: ${res.stderr}`);
  });
}

console.log("\nempty {} JSON → exit 1 + Missing required fields message");
const emptyJson = tmpJson({});
for (const r of REPORTS) {
  test(r, () => {
    const res = run(r, emptyJson);
    assert.strictEqual(res.status, 1, `exit ${res.status}, stderr: ${res.stderr}`);
    assert.ok(res.stderr.includes("Missing required fields"),
      `expected 'Missing required fields' in stderr, got: ${res.stderr}`);
  });
}
fs.unlinkSync(emptyJson);

console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (reports smoke)`);
}
