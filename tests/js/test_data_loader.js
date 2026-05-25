"use strict";
/**
 * tests/js/test_data_loader.js
 * Unit tests for lib/data-loader.js — covers loadJson, requireFields, ensureOutDir.
 * Each test spawns a small node child so we can assert on argv handling and exit codes.
 * Run: node tests/js/test_data_loader.js
 */
const assert = require("assert");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const { spawnSync } = require("child_process");

const LOADER = path.resolve(__dirname, "../../lib/data-loader.js");

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

function tmpJson(obj) {
  const f = path.join(os.tmpdir(), `dl_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(obj));
  return f;
}

function runChild(script, argv = []) {
  const f = path.join(os.tmpdir(), `dl_runner_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(f, script);
  const r = spawnSync(process.execPath, [f, ...argv], { encoding: "utf8" });
  fs.unlinkSync(f);
  return r;
}

// ── loadJson ────────────────────────────────────────────────────────────────
console.log("\nloadJson");

test("loadJson exits 1 when no path arg is given", () => {
  const r = runChild(`require("${LOADER}").loadJson("metrics");`);
  assert.strictEqual(r.status, 1, `expected exit 1, got ${r.status}`);
  assert.ok(r.stderr.includes("Usage:"), `expected Usage message, got: ${r.stderr}`);
});

test("loadJson exits 1 on unreadable file", () => {
  const r = runChild(`require("${LOADER}").loadJson("metrics");`, ["/nonexistent/abc.json"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("Error loading"), `got: ${r.stderr}`);
});

test("loadJson exits 1 on invalid JSON", () => {
  const bad = path.join(os.tmpdir(), `bad_${Date.now()}.json`);
  fs.writeFileSync(bad, "{not valid json");
  const r = runChild(`require("${LOADER}").loadJson("metrics");`, [bad]);
  fs.unlinkSync(bad);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("Error loading"));
});

test("loadJson returns parsed object on success", () => {
  const good = tmpJson({ a: 1, b: "two" });
  const r = runChild(
    `const d = require("${LOADER}").loadJson("metrics"); console.log(JSON.stringify(d));`,
    [good]
  );
  fs.unlinkSync(good);
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
  assert.deepStrictEqual(JSON.parse(r.stdout.trim()), { a: 1, b: "two" });
});

test("loadJson uses default label when omitted", () => {
  const r = runChild(`require("${LOADER}").loadJson();`, ["/nonexistent.json"]);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("Error loading metrics"), `expected default 'metrics' label, got: ${r.stderr}`);
});

// ── requireFields ───────────────────────────────────────────────────────────
console.log("\nrequireFields");

test("requireFields passes when all required keys present", () => {
  const { requireFields } = require("../../lib/data-loader");
  assert.doesNotThrow(() => requireFields({ a: 1, b: 2 }, ["a", "b"]));
});

test("requireFields exits 1 when a key is missing", () => {
  const r = runChild(`require("${LOADER}").requireFields({ a: 1 }, ["a", "b"]);`);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("Missing required fields"), `got: ${r.stderr}`);
  assert.ok(r.stderr.includes("b"), `expected to flag 'b': ${r.stderr}`);
});

test("requireFields treats null as missing", () => {
  const r = runChild(`require("${LOADER}").requireFields({ a: null }, ["a"]);`);
  assert.strictEqual(r.status, 1);
});

test("requireFields treats undefined as missing", () => {
  const r = runChild(`require("${LOADER}").requireFields({}, ["a"]);`);
  assert.strictEqual(r.status, 1);
});

test("requireFields treats empty string as PRESENT (not missing)", () => {
  const { requireFields } = require("../../lib/data-loader");
  assert.doesNotThrow(() => requireFields({ a: "" }, ["a"]));
});

test("requireFields treats 0 as PRESENT (not missing)", () => {
  const { requireFields } = require("../../lib/data-loader");
  assert.doesNotThrow(() => requireFields({ a: 0 }, ["a"]));
});

test("requireFields treats false as PRESENT (not missing)", () => {
  const { requireFields } = require("../../lib/data-loader");
  assert.doesNotThrow(() => requireFields({ a: false }, ["a"]));
});

test("requireFields lists all missing fields in one message", () => {
  const r = runChild(`require("${LOADER}").requireFields({}, ["a", "b", "c"]);`);
  assert.strictEqual(r.status, 1);
  assert.ok(r.stderr.includes("a") && r.stderr.includes("b") && r.stderr.includes("c"),
    `expected all 3 in message: ${r.stderr}`);
});

// ── ensureOutDir ────────────────────────────────────────────────────────────
console.log("\nensureOutDir");

test("ensureOutDir returns the repo's out/ path", () => {
  const { ensureOutDir } = require("../../lib/data-loader");
  const p = ensureOutDir();
  assert.ok(p.endsWith("/out") || p.endsWith("\\out"), `unexpected path: ${p}`);
});

test("ensureOutDir creates the directory if it does not exist", () => {
  // We can't easily prove this without deleting the real out/ directory.
  // Instead, verify it exists after calling.
  const { ensureOutDir } = require("../../lib/data-loader");
  const p = ensureOutDir();
  assert.ok(fs.existsSync(p), `out dir was not created at ${p}`);
});

test("ensureOutDir is idempotent — calling twice does not throw", () => {
  const { ensureOutDir } = require("../../lib/data-loader");
  assert.doesNotThrow(() => { ensureOutDir(); ensureOutDir(); });
});

// ── dateSlug ────────────────────────────────────────────────────────────────
console.log("\ndateSlug");

test("converts ISO timestamp to digit-dashed slug", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("2026-05-23T14:32:00"), "2026-05-23-14-32-00");
});

test("collapses consecutive dashes", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("2026--05--23"), "2026-05-23");
});

test("trims leading/trailing dashes", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("---2026---"), "2026");
});

test("returns 'unknown-date' on empty input", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug(""), "unknown-date");
});

test("returns 'unknown-date' on null", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug(null), "unknown-date");
});

test("returns 'unknown-date' on undefined", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug(undefined), "unknown-date");
});

test("returns 'unknown-date' on input with no digits", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("not-a-date"), "unknown-date");
});

// ── natural-language dates (the path that previously dropped the month) ────

test("parses 'Month DD, YYYY' to YYYY-MM-DD", () => {
  // Regression: previously stripped to "25-2026", losing the month entirely
  // because "May" → "" under the digit-only strip.
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("May 25, 2026"), "2026-05-25");
});

test("parses 'Weekday, Month DD, YYYY' to YYYY-MM-DD", () => {
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("Saturday, May 23, 2026"), "2026-05-23");
});

test("preserves ISO timestamp digit-strip behaviour (lone 'T' isn't a word)", () => {
  // The {2,}-letter check skips ISO-style strings whose only alpha char is
  // the date/time separator T. They flow through the digit-strip path,
  // preserving full timestamp precision in the filename.
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("2026-05-23T14:32:00"), "2026-05-23-14-32-00");
});

test("falls back to digit-strip when natural-language parse fails", () => {
  // "Q2 2026" has only a single letter (Q) — under the 2+ threshold, so it
  // skips Date.parse and digit-strips to "2-2026".
  const { dateSlug } = require("../../lib/data-loader");
  assert.strictEqual(dateSlug("Q2 2026"), "2-2026");
});

// ── summary ────────────────────────────────────────────────────────────────
console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (data-loader)`);
}
