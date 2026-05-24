"use strict";
/**
 * tests/js/test_copy_to_desktop.js
 * Unit tests for lib/copy-to-desktop.js — verifies the "never fatal" contract
 * and that copies only happen when ~/Desktop/CS Reports/<category>/ exists.
 *
 * Uses HOME override (env) to point at a tmp dir so we can simulate both
 * present and missing target directories without touching the real Desktop.
 * Run: node tests/js/test_copy_to_desktop.js
 */
const assert = require("assert");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");
const { spawnSync } = require("child_process");

const COPY = path.resolve(__dirname, "../../lib/copy-to-desktop.js");

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

function tmpDir(suffix = "") {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cpd_${suffix}_`));
  return d;
}

function makeSrc(dir, name = "src.docx") {
  const p = path.join(dir, name);
  fs.writeFileSync(p, "fake-docx-bytes");
  return p;
}

/** Run copyToDesktop in a child process with HOMEDIR overridden via os.homedir patch. */
function runWithHome(home, src, category, label) {
  const script = `
    const os = require("os");
    os.homedir = () => ${JSON.stringify(home)};
    const { copyToDesktop } = require(${JSON.stringify(COPY)});
    copyToDesktop(${JSON.stringify(src)}, ${JSON.stringify(category)}, ${JSON.stringify(label)});
  `;
  const f = path.join(os.tmpdir(), `cpd_runner_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(f, script);
  const r = spawnSync(process.execPath, [f], { encoding: "utf8" });
  fs.unlinkSync(f);
  return r;
}

// ── no destination → silent no-op ───────────────────────────────────────────
console.log("\nno destination present");

test("returns silently when ~/Desktop/CS Reports/<category>/ does not exist", () => {
  const home = tmpDir("nodst");
  const srcDir = tmpDir("src");
  const src = makeSrc(srcDir);
  // No Desktop folder created at all
  const r = runWithHome(home, src, "Intercom", "Daily");
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
  // Nothing should have been printed (no "→ Desktop copy:" line)
  assert.ok(!r.stdout.includes("Desktop copy"),
    `expected silent no-op, got stdout: ${r.stdout}`);
});

test("returns silently when Desktop exists but category dir does not", () => {
  const home = tmpDir("partial");
  fs.mkdirSync(path.join(home, "Desktop", "CS Reports"), { recursive: true });
  // Intentionally do NOT create the Intercom subfolder
  const src = makeSrc(tmpDir("src2"));
  const r = runWithHome(home, src, "Intercom", "Daily");
  assert.strictEqual(r.status, 0);
  assert.ok(!r.stdout.includes("Desktop copy"));
});

// ── destination present → copy succeeds ─────────────────────────────────────
console.log("\ndestination present");

test("copies file to ~/Desktop/CS Reports/<category>/<Category>_<Label>_Latest.docx", () => {
  const home = tmpDir("ok");
  const category = "Intercom";
  const dest = path.join(home, "Desktop", "CS Reports", category);
  fs.mkdirSync(dest, { recursive: true });
  const src = makeSrc(tmpDir("src3"));
  const r = runWithHome(home, src, category, "Weekly");
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
  const expected = path.join(dest, "Intercom_Weekly_Latest.docx");
  assert.ok(fs.existsSync(expected), `expected ${expected} to exist`);
  assert.ok(r.stdout.includes("Desktop copy"), `expected log line in stdout: ${r.stdout}`);
});

test("overwrites an existing _Latest.docx on subsequent runs", () => {
  const home = tmpDir("overwrite");
  const category = "Onboarding";
  const dest = path.join(home, "Desktop", "CS Reports", category);
  fs.mkdirSync(dest, { recursive: true });
  // Seed an old file
  const target = path.join(dest, "Onboarding_Monthly_Latest.docx");
  fs.writeFileSync(target, "OLD CONTENT");
  const src = makeSrc(tmpDir("src4"));
  const r = runWithHome(home, src, category, "Monthly");
  assert.strictEqual(r.status, 0);
  assert.strictEqual(fs.readFileSync(target, "utf8"), "fake-docx-bytes");
});

// ── error path is non-fatal ─────────────────────────────────────────────────
console.log("\nnever fatal");

test("does not throw when source file does not exist", () => {
  const home = tmpDir("noSrc");
  const dest = path.join(home, "Desktop", "CS Reports", "Intercom");
  fs.mkdirSync(dest, { recursive: true });
  const r = runWithHome(home, "/nonexistent/file.docx", "Intercom", "Daily");
  // Even though copy fails, exit must be 0 (silently swallowed)
  assert.strictEqual(r.status, 0, `stderr: ${r.stderr}`);
});

// ── summary ────────────────────────────────────────────────────────────────
console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (copy-to-desktop)`);
}
