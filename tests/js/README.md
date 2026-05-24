# JS Tests

JavaScript tests for `lib/` and `reports/`. No external dependencies — every test file uses Node's built-in `assert` module and a 12-line in-file runner. This keeps `npm install` fast and the test suite trivially portable.

## Running

```bash
make test-js          # all JS suites
node tests/js/test_<name>.js   # one suite
```

Both `make test` (full Python + JS suite) and `npm test` run every file in this directory.

## File-naming convention

`test_<thing>.js` — one suite per file. The Makefile lists each file explicitly, so adding a new suite requires adding one line to `Makefile`'s `test-js` target AND to `package.json`'s `test` script.

## The in-file runner

Every suite uses this same shape:

```js
const assert = require("assert");

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") {
      // async test — surface promise rejection as a failure
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

// ── group ───────────────────────────────────────
console.log("\ngroup name");
test("does the thing", () => {
  assert.strictEqual(actual, expected);
});

// ── summary (sync suites) ───────────────────────
console.log("");
if (failed > 0) {
  console.error(`${passed} passed, ${failed} failed`);
  process.exit(1);
} else {
  console.log(`${passed} passed, 0 failed (<suite name>)`);
}
```

If the suite has async tests, end with `setTimeout(() => { ... }, 500)` instead of running the summary inline. See `test_report_theme.js` for an example.

## What's covered

| File | Tests | Covers |
|---|---|---|
| `test_csv_export.js` | 28 | `lib/csv-export.js` — escapeCsv, multi-section layout, CSV injection defense, non-fatal write errors |
| `test_report_theme.js` | 22 | `lib/report-theme.js` — kpiStrip width math (n=1–12), delta=0 regression, buildDocument smoke, publishReport contract |
| `test_data_loader.js` | 23 | `lib/data-loader.js` — loadJson, requireFields, ensureOutDir, dateSlug edge cases |
| `test_copy_to_desktop.js` | 5 | `lib/copy-to-desktop.js` — silent no-op when Desktop missing, overwrite behavior, never throws |
| `test_reports_smoke.js` | 51 | `reports/*.js` — 3 CLI-contract checks × 17 reports (no-arg, bad path, missing fields) |

Run `make lint-js` (biome) before pushing — it catches the bug class the smoke tests miss (undefined identifiers, unused imports).

## Adding a new test file

1. Create `tests/js/test_<name>.js` using the runner shape above.
2. Add `node tests/js/test_<name>.js` to the `test-js:` target in `Makefile`.
3. Add the same line (separated by ` && `) to `package.json`'s `scripts.test`.
4. Update `/review-code`'s test count header.
