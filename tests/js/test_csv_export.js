"use strict";
/**
 * tests/js/test_csv_export.js
 * Unit tests for lib/csv-export.js — no external dependencies.
 * Run: node tests/js/test_csv_export.js
 */
const assert = require("assert");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");

const { writeCsv } = require("../../lib/csv-export");

// ── tiny test runner ────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────
function tmpFile() {
  return path.join(os.tmpdir(), `csv_test_${Date.now()}_${Math.random().toString(36).slice(2)}.csv`);
}
function write(sections) {
  const f = tmpFile();
  writeCsv(f, sections);
  return fs.readFileSync(f, "utf8");
}

// ── escapeCsv edge cases (exercised through writeCsv output) ────────────────
console.log("\nescape behaviour");

test("plain value — no quotes added", () => {
  const out = write([{ rows: [["hello"]] }]);
  assert.strictEqual(out.trim(), "hello");
});

test("value with comma — wrapped in double quotes", () => {
  const out = write([{ rows: [["hello, world"]] }]);
  assert.strictEqual(out.trim(), '"hello, world"');
});

test("value with double quote — quote is doubled", () => {
  const out = write([{ rows: [[`say "hi"`]] }]);
  assert.strictEqual(out.trim(), '"say ""hi"""');
});

test("value with newline — wrapped in double quotes", () => {
  const out = write([{ rows: [["line1\nline2"]] }]);
  assert.strictEqual(out.trim(), '"line1\nline2"');
});

test("null value — becomes empty string, not 'null'", () => {
  const out = write([{ rows: [[null]] }]);
  assert.strictEqual(out.trim(), "");
});

test("undefined value — becomes empty string, not 'undefined'", () => {
  const out = write([{ rows: [[undefined]] }]);
  assert.strictEqual(out.trim(), "");
});

test("numeric value — coerced to string without quotes", () => {
  const out = write([{ rows: [[42]] }]);
  assert.strictEqual(out.trim(), "42");
});

test("value with both comma and quote — wrapped and quote doubled", () => {
  const out = write([{ rows: [[`a,"b"`]] }]);
  assert.strictEqual(out.trim(), '"a,""b"""');
});

// ── section structure ───────────────────────────────────────────────────────
console.log("\nsection structure");

test("title row written as '# Title'", () => {
  const out = write([{ title: "My Section", rows: [] }]);
  assert.ok(out.startsWith("# My Section"), `got: ${JSON.stringify(out)}`);
});

test("no title row when sec.title is absent", () => {
  const out = write([{ rows: [["a", "b"]] }]);
  assert.ok(!out.includes("#"), `got: ${JSON.stringify(out)}`);
});

test("headers row written before data rows", () => {
  const out = write([{ headers: ["Col1", "Col2"], rows: [["v1", "v2"]] }]);
  const lines = out.split("\n");
  assert.strictEqual(lines[0], "Col1,Col2");
  assert.strictEqual(lines[1], "v1,v2");
});

test("no header row when sec.headers is absent", () => {
  const out = write([{ rows: [["v1", "v2"]] }]);
  assert.strictEqual(out.trim(), "v1,v2");
});

test("empty rows array — only title and header written", () => {
  const out = write([{ title: "Empty", headers: ["A", "B"], rows: [] }]);
  const lines = out.split("\n").filter(l => l.length > 0);
  assert.strictEqual(lines.length, 2);
  assert.strictEqual(lines[0], "# Empty");
  assert.strictEqual(lines[1], "A,B");
});

// ── multi-section layout ────────────────────────────────────────────────────
console.log("\nmulti-section layout");

test("blank line between two sections", () => {
  const out = write([
    { title: "S1", rows: [["a"]] },
    { title: "S2", rows: [["b"]] },
  ]);
  const lines = out.split("\n");
  // pattern: # S1 / a / <blank> / # S2 / b
  assert.ok(lines.includes(""), "expected blank line between sections");
  const blankIdx  = lines.indexOf("");
  const s1LineIdx = lines.indexOf("# S1");
  const s2LineIdx = lines.indexOf("# S2");
  assert.ok(s1LineIdx < blankIdx, "blank should come after S1");
  assert.ok(blankIdx < s2LineIdx, "blank should come before S2");
});

test("no blank line before the first section", () => {
  const out = write([{ title: "First", rows: [] }]);
  assert.ok(!out.startsWith("\n"), "first section must not be preceded by a blank line");
});

test("three sections produce two blank-line separators", () => {
  const out = write([
    { title: "A", rows: [["1"]] },
    { title: "B", rows: [["2"]] },
    { title: "C", rows: [["3"]] },
  ]);
  const blanks = out.split("\n").filter(l => l === "").length;
  assert.strictEqual(blanks, 2, `expected 2 blank lines, got ${blanks}`);
});

test("full section order: title, headers, data rows", () => {
  const out = write([{ title: "Report", headers: ["Name", "Val"], rows: [["foo", "1"], ["bar", "2"]] }]);
  const lines = out.split("\n");
  assert.strictEqual(lines[0], "# Report");
  assert.strictEqual(lines[1], "Name,Val");
  assert.strictEqual(lines[2], "foo,1");
  assert.strictEqual(lines[3], "bar,2");
});

test("section without title but with headers and rows", () => {
  const out = write([{ headers: ["X", "Y"], rows: [["1", "2"]] }]);
  const lines = out.split("\n");
  assert.strictEqual(lines[0], "X,Y");
  assert.strictEqual(lines[1], "1,2");
});

// ── formula injection defense ───────────────────────────────────────────────
console.log("\nformula injection defense");

test("leading = is prefixed with a single quote", () => {
  const out = write([{ rows: [["=SUM(A1:A10)"]] }]);
  assert.strictEqual(out.trim(), "'=SUM(A1:A10)");
});

test("leading + is prefixed", () => {
  const out = write([{ rows: [["+1234"]] }]);
  assert.strictEqual(out.trim(), "'+1234");
});

test("leading - is prefixed (treated as formula by Excel)", () => {
  const out = write([{ rows: [["-1234"]] }]);
  assert.strictEqual(out.trim(), "'-1234");
});

test("leading @ is prefixed", () => {
  const out = write([{ rows: [["@something"]] }]);
  assert.strictEqual(out.trim(), "'@something");
});

test("leading tab is prefixed", () => {
  const out = write([{ rows: [["\t=evil()"]] }]);
  // The leading tab gets the quote, then the comma-free value isn't wrapped.
  assert.strictEqual(out.trim(), "'\t=evil()");
});

test("equals NOT at the start is left alone", () => {
  const out = write([{ rows: [["x=1"]] }]);
  assert.strictEqual(out.trim(), "x=1");
});

test("injection value containing comma still gets both fixes", () => {
  const out = write([{ rows: [["=HYPERLINK(\"http://x\"),foo"]] }]);
  // Single quote prefix + wrapped in quotes + internal quote doubled.
  assert.strictEqual(out.trim(), '"\'=HYPERLINK(""http://x""),foo"');
});

// ── resilience ───────────────────────────────────────────────────────────────
console.log("\nresilience");

test("write failure logs to stderr but does not throw", () => {
  const origErr = console.error;
  let captured = "";
  console.error = (msg) => { captured += msg; };
  try {
    assert.doesNotThrow(() => {
      writeCsv("/nonexistent/dir/output.csv", [{ rows: [["x"]] }]);
    });
    assert.ok(captured.includes("CSV write failed"),
      `expected error message on stderr, got: ${captured}`);
  } finally {
    console.error = origErr;
  }
});

test("empty sections array — writes nothing but does not throw", () => {
  const f = tmpFile();
  assert.doesNotThrow(() => writeCsv(f, []));
  // File should exist with empty content (lines.join("\n") of [] is "")
  if (fs.existsSync(f)) {
    assert.strictEqual(fs.readFileSync(f, "utf8"), "");
  }
});

test("missing rows key — treated as empty array, does not throw", () => {
  assert.doesNotThrow(() => {
    write([{ title: "T", headers: ["A"] }]); // no rows key
  });
});

// ── summary ──────────────────────────────────────────────────────────────────
console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (JS)`);
}
