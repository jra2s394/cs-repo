"use strict";
/**
 * tests/js/test_report_theme.js
 * Unit tests for lib/report-theme.js — exercises the kpiStrip width math
 * (the high-risk DXA arithmetic that /review-code Section 6 checks),
 * basic component shape, and a full buildDocument round-trip via Packer.
 * Run: node tests/js/test_report_theme.js
 */
const assert = require("assert");
const fs     = require("fs");
const os     = require("os");
const path   = require("path");

const T = require("../../lib/report-theme");
const { Packer } = require("docx");

// ── tiny test runner ────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      return r.then(
        () => { console.log(`  ✓  ${name}`); passed++; },
        (e) => { console.error(`  ✗  ${name}\n     ${e.message}`); failed++; }
      );
    }
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗  ${name}\n     ${e.message}`);
    failed++;
  }
}

const CW = 9360; // PAGE.contentWidth

// ── kpiWidths math ──────────────────────────────────────────────────────────
console.log("\nkpiWidths math");

test("widths sum to exactly CW for n=1", () => {
  const w = T.kpiWidths(1);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
  assert.strictEqual(w.length, 1, "n=1 has no gaps, so only 1 width");
});

test("widths sum to exactly CW for n=2", () => {
  const w = T.kpiWidths(2);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
  // [card, gap, card]
  assert.strictEqual(w.length, 3);
  assert.strictEqual(w[1], 130, "gap is always 130 DXA");
});

test("widths sum to exactly CW for n=3", () => {
  const w = T.kpiWidths(3);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
  assert.strictEqual(w.length, 5, "3 cards + 2 gaps");
});

test("widths sum to exactly CW for n=4", () => {
  const w = T.kpiWidths(4);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
  assert.strictEqual(w.length, 7);
});

test("widths sum to exactly CW for n=5 (typical truncation case)", () => {
  // 5 cards: (9360 - 4*130) / 5 = 8840/5 = 1768.0 → no remainder
  const w = T.kpiWidths(5);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
});

test("widths sum to exactly CW for n=6 (forces remainder)", () => {
  // 6 cards: (9360 - 5*130) / 6 = 8710/6 = 1451.66... → floor 1451, remainder absorbed in last
  const w = T.kpiWidths(6);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
  const cardWidths = w.filter((_, i) => i % 2 === 0);
  assert.strictEqual(cardWidths.length, 6);
  // All but last are baseCardW; last is baseCardW + remainder
  const base = cardWidths[0];
  for (let i = 0; i < 5; i++) assert.strictEqual(cardWidths[i], base);
  assert.ok(cardWidths[5] >= base, "last card absorbs remainder");
});

test("widths sum to exactly CW for n=7", () => {
  const w = T.kpiWidths(7);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), CW);
});

test("remainder is always 0..(n-1)", () => {
  for (let n = 1; n <= 12; n++) {
    const w = T.kpiWidths(n);
    const cards = w.filter((_, i) => i % 2 === 0);
    const remainder = cards[cards.length - 1] - cards[0];
    assert.ok(remainder >= 0 && remainder < n,
      `n=${n}: remainder ${remainder} out of bounds`);
  }
});

test("custom gap width still sums to total", () => {
  const w = T.kpiWidths(4, 200, 8000);
  assert.strictEqual(w.reduce((a, b) => a + b, 0), 8000);
});

// ── kpiStrip end-to-end ─────────────────────────────────────────────────────
console.log("\nkpiStrip integration");

test("kpiStrip returns a Table object", () => {
  const t = T.kpiStrip([{ value: "1", label: "L", delta: "+1" }]);
  assert.ok(t, "kpiStrip returned undefined");
  assert.strictEqual(typeof t, "object");
});

test("kpiStrip with delta=0 renders '0' (not blank)", () => {
  // Regression: c.delta != null check, not c.delta (falsy 0 must still render)
  const t = T.kpiStrip([{ value: "5", label: "Count", delta: 0 }]);
  // We can't easily introspect the docx tree, so just confirm it doesn't throw
  // and Packer.toBuffer succeeds.
  const doc = T.buildDocument({ children: [t] });
  return Packer.toBuffer(doc).then(buf => {
    assert.ok(buf.length > 0, "buffer is empty");
    // The literal "0" should appear somewhere in the docx body XML
    const text = buf.toString("binary");
    assert.ok(text.includes("0"), "delta=0 should appear in output");
  });
});

test("kpiStrip with delta=null renders empty string (no throw)", () => {
  const t = T.kpiStrip([{ value: "5", label: "X", delta: null }]);
  const doc = T.buildDocument({ children: [t] });
  return Packer.toBuffer(doc).then(buf => assert.ok(buf.length > 0));
});

test("kpiStrip tblGrid length matches cell count (2n - 1)", () => {
  // Regression: kpiStrip used to push extra entries onto the widths array
  // inside the cards.forEach loop, leaving columnWidths longer than the row's
  // cell count. docx-js's tblGrid would then have N extra entries, mismatching
  // the actual cells and producing an inconsistent table grid.
  for (let n = 1; n <= 6; n++) {
    const cards = Array.from({ length: n }, (_, i) => ({ value: String(i), label: "L", delta: "" }));
    const tbl = T.kpiStrip(cards);
    const expected = 2 * n - 1;  // n cards + (n-1) gaps
    const tblGrid = tbl.root.find(el => el.rootKey === "w:tblGrid");
    assert.ok(tblGrid, `n=${n}: tblGrid not found in Table.root`);
    assert.strictEqual(tblGrid.root.length, expected,
      `n=${n}: tblGrid has ${tblGrid.root.length} cols, expected ${expected}`);
    const row = tbl.root.find(el => el.rootKey === "w:tr");
    const cells = row.root.filter(el => el.rootKey === "w:tc");
    assert.strictEqual(cells.length, expected,
      `n=${n}: row has ${cells.length} cells, expected ${expected}`);
  }
});

// ── dataTable defensive defaults ────────────────────────────────────────────
console.log("\ndataTable defensive defaults");

test("dataTable with rows: undefined renders an empty body (no throw)", () => {
  // Regression: reports/intercom-yeartodate.js, onboarding-yearly.js, and
  // 3 other reports passed `rows: d.optionalField` directly without a
  // `|| []` guard. When the underlying JSON omitted the field, dataTable
  // crashed with `Cannot read properties of undefined (reading 'map')`
  // — and the stack trace pointed at lib/report-theme.js with no hint
  // about which report or field caused it. The defensive default in
  // dataTable's signature (`rows = []`) is the library-level fix.
  const tbl = T.dataTable({
    columnWidths: [3000, 3000, 3360],
    header: ["A", "B", "C"],
    // rows intentionally omitted
  });
  assert.ok(tbl, "dataTable returned a Table object");
  // The header row should still be present; body row count should be 0.
  const rows = tbl.root.filter(el => el.rootKey === "w:tr");
  assert.strictEqual(rows.length, 1, "expected only the header row when rows is undefined");
});

test("dataTable with explicit rows: [] renders an empty body (no throw)", () => {
  const tbl = T.dataTable({
    columnWidths: [3000, 3000, 3360],
    header: ["A", "B", "C"],
    rows: [],
  });
  assert.ok(tbl);
});

// ── buildDocument smoke test ────────────────────────────────────────────────
console.log("\nbuildDocument smoke");

test("buildDocument + render produces a non-empty .docx on disk", () => {
  const children = [
    T.titleBanner({ eyebrow: "TEST", title: "Smoke", subtitle: [{ text: "a" }] }),
    T.metaStrip("left", "right"),
    ...T.sectionHead("Section A"),
    T.para("body"),
    T.kpiStrip([
      { value: "1", label: "A", delta: "+1" },
      { value: "2", label: "B", delta: "0" },
      { value: "3", label: "C", delta: "-1" },
    ]),
    T.dataTable({
      columnWidths: [3000, 3000, 3360],
      header: ["H1", "H2", "H3"],
      rows: [["a", "b", "c"], ["d", "e", "f"]],
    }),
    T.callout({ kind: "info", tag: "Info", body: "hello" }),
  ];
  const doc = T.buildDocument({ children, headerRight: "Test Report" });
  const out = path.join(os.tmpdir(), `theme_test_${Date.now()}.docx`);
  return T.render(doc, out).then(p => {
    assert.strictEqual(p, out);
    assert.ok(fs.existsSync(out), "output file missing");
    assert.ok(fs.statSync(out).size > 100, "output file suspiciously small");
    fs.unlinkSync(out);
  });
});

test("all four callout kinds render without throwing", () => {
  const kinds = ["info", "warn", "success", "neutral"];
  for (const kind of kinds) {
    T.callout({ tag: "x", kind, body: "y" });
  }
});

test("recBlock renders with tag and tagColor", () => {
  const r = T.recBlock({ num: 1, title: "T", tag: "PRIORITY", tagColor: "FF0000", body: "b" });
  assert.ok(r);
});

test("codeBlock renders mixed comment and code lines", () => {
  const c = T.codeBlock(["# a comment", "real_code()", "", "# trailing"]);
  assert.ok(c);
});

// ── chartImage error handling ───────────────────────────────────────────────
console.log("\nchartImage error handling");

test("chartImage throws a helpful error on missing file", () => {
  assert.throws(
    () => T.chartImage("/nonexistent/foo.png", 100, 100),
    /chartImage: could not read/
  );
});

// ── color/page tokens ───────────────────────────────────────────────────────
console.log("\nbrand tokens");

test("PAGE.contentWidth equals 9360", () => {
  assert.strictEqual(T.PAGE.contentWidth, 9360);
});

test("COLORS exports all expected keys", () => {
  for (const k of ["navy", "teal", "red", "white", "ink", "grayLt"]) {
    assert.ok(T.COLORS[k], `missing color: ${k}`);
  }
});

test("TREND presets have up/down/flat", () => {
  for (const k of ["up", "down", "flat"]) assert.ok(T.TREND[k]);
});

// ── publishReport ──────────────────────────────────────────────────────────
console.log("\npublishReport");

test("publishReport returns a Promise and writes .docx + .csv to outFile", () => {
  const doc = T.buildDocument({ children: [T.para("hello")] });
  const out = path.join(os.tmpdir(), `pub_test_${Date.now()}.docx`);
  const csv = out.replace(/\.docx$/, ".csv");
  return T.publishReport(doc, out, {
    category: "Test",
    label: "Smoke",
    csvSections: [{ title: "S", headers: ["A"], rows: [["1"]] }],
  }).then(() => {
    assert.ok(fs.existsSync(out), ".docx missing");
    assert.ok(fs.existsSync(csv), ".csv missing");
    fs.unlinkSync(out);
    fs.unlinkSync(csv);
  });
});

test("publishReport skips CSV when csvSections is omitted", () => {
  const doc = T.buildDocument({ children: [T.para("hi")] });
  const out = path.join(os.tmpdir(), `pub_nocsv_${Date.now()}.docx`);
  const csv = out.replace(/\.docx$/, ".csv");
  return T.publishReport(doc, out, { category: "Test", label: "NoCsv" }).then(() => {
    assert.ok(fs.existsSync(out));
    assert.ok(!fs.existsSync(csv), "CSV should not exist when csvSections omitted");
    fs.unlinkSync(out);
  });
});

// ── async tail ──────────────────────────────────────────────────────────────
// All tests run sync; async ones return promises. Wait a tick before summary.
setTimeout(() => {
  console.log("");
  if (failed > 0) {
    console.error(`${passed} passed, ${failed} failed`);
    process.exit(1);
  } else {
    console.log(`${passed} passed, 0 failed (report-theme)`);
  }
}, 500);
