"use strict";
/**
 * tests/js/test_reports_smoke.js
 * Smoke tests for reports/*.js — runs every report through four scenarios:
 *   1. Running with no arg → exit 1, prints "Usage:"
 *   2. Running with a bad path → exit 1, prints "Error loading"
 *   3. Running with an empty {} JSON → exit 1, prints "Missing required fields"
 *   4. Running with a valid fixture from tests/js/fixtures/report-fixtures.js
 *      → exit 0, produces a non-empty .docx in out/ (and matching .csv if the
 *      report writes one). Generated files are cleaned up at the end so the
 *      tree stays unpolluted between runs.
 *
 * docx-internal structural validation is covered by test_report_theme.js;
 * here we just guard the CLI + end-to-end-runs contract.
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

// ── positive end-to-end: full happy-path render ───────────────────────────
// Each report runs against a minimal valid metrics JSON and must produce a
// .docx on disk. Catches regressions like "renamed a field" / "removed a
// table that the renderer still calls .map on" that the failure-path
// smoke tests miss by design.
//
// File detection is mtime-based, not set-diff: reports often overwrite
// an existing file at the same path (filename derives from period, which
// reuses across test runs), so checking "did a new filename appear" gives
// false negatives on the second run.
const FIXTURES = require("./fixtures/report-fixtures");
const OUT_DIR = path.resolve(__dirname, "../../out");
const producedFiles = new Set();

console.log("\nvalid JSON → exit 0 + .docx produced");
for (const r of REPORTS) {
  test(r, () => {
    const fixture = FIXTURES[r];
    assert.ok(fixture, `no fixture defined for ${r} in tests/js/fixtures/report-fixtures.js`);
    const testStart = Date.now();
    const fixturePath = tmpJson(fixture);
    const res = run(r, fixturePath);
    fs.unlinkSync(fixturePath);
    assert.strictEqual(res.status, 0,
      `expected exit 0, got ${res.status}.\nstderr: ${res.stderr}\nstdout: ${res.stdout}`);
    // At least one .docx in out/ must have an mtime at or after this test
    // started (handles same-filename overwrites between runs).
    assert.ok(fs.existsSync(OUT_DIR), `${OUT_DIR} not created by report`);
    const recentDocx = fs.readdirSync(OUT_DIR)
      .filter(f => f.endsWith(".docx"))
      .filter(f => fs.statSync(path.join(OUT_DIR, f)).mtimeMs >= testStart);
    assert.ok(recentDocx.length > 0,
      `expected at least one .docx with mtime >= test start in ${OUT_DIR}`);
    for (const f of recentDocx) {
      const fullPath = path.join(OUT_DIR, f);
      assert.ok(fs.statSync(fullPath).size > 0, `${f} is empty`);
      producedFiles.add(fullPath);
      // Track the matching CSV too if the report wrote one.
      const csv = fullPath.replace(/\.docx$/, ".csv");
      if (fs.existsSync(csv)) producedFiles.add(csv);
    }
  });
}

// Cleanup any out/ files this test produced so the working tree stays clean
// (out/ is gitignored but we don't want to litter local developer machines).
for (const f of producedFiles) {
  try { fs.unlinkSync(f); } catch (_) { /* already gone */ }
}

console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (reports smoke)`);
}
