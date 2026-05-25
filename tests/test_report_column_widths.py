"""Every `columnWidths: [...]` literal in `reports/*.js` must sum to exactly
9360 DXA (the content width on US Letter with the standard margins).

A mismatched sum makes docx-js reflow column widths at render time so the
table no longer matches the cells, producing the kind of layout corruption
PR #75 chased through `kpiStrip`. The /review-code Section 6 checklist
spot-checks this manually for one or two reports per pass — this test
locks it down for every table in every report.

Only literal numeric arrays are checked. Helpers that compute widths
dynamically (kpiStrip via kpiWidths, sectionHead's 70/CW-70 split,
callout's 60/CW-60 split) are excluded — kpiWidths math has its own
dedicated tests in tests/js/test_report_theme.js.
"""
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
REPORTS_DIR = REPO_ROOT / "reports"
EXPECTED = 9360

LITERAL_WIDTHS_RE = re.compile(r"columnWidths:\s*\[([0-9,\s]+)\]")


def _literal_widths(report: Path):
    """Yield (line_no, widths_list) for every `columnWidths: [int, int, ...]`
    in the file. Skips arrays containing identifiers/expressions like `CW - 70`,
    which are dynamic and validated separately."""
    for line_no, line in enumerate(report.read_text(encoding="utf-8").splitlines(), 1):
        m = LITERAL_WIDTHS_RE.search(line)
        if not m:
            continue
        nums = [int(x.strip()) for x in m.group(1).split(",") if x.strip()]
        if nums:
            yield line_no, nums


REPORTS = sorted(REPORTS_DIR.glob("*.js"))


@pytest.mark.parametrize("report", REPORTS, ids=lambda p: p.name)
def test_column_widths_sum_to_9360(report: Path):
    bad = []
    for line_no, widths in _literal_widths(report):
        if sum(widths) != EXPECTED:
            bad.append((line_no, widths, sum(widths)))
    assert not bad, (
        f"{report.name} has columnWidths arrays that don't sum to {EXPECTED}:\n"
        + "\n".join(
            f"  L{ln}: sum={s} (off by {s - EXPECTED}) widths={w}"
            for ln, w, s in bad
        )
        + "\nFix the widths so the table matches PAGE.contentWidth — otherwise "
        "docx-js will reflow at render time."
    )


def test_every_report_has_at_least_one_column_widths_literal():
    """Sanity: if a report has zero matching arrays, the parser drifted from
    the actual JS syntax. Catches a silent test-success after a refactor."""
    reports_with_zero = [
        r.name for r in REPORTS if not list(_literal_widths(r))
    ]
    assert not reports_with_zero, (
        f"these reports had no matching columnWidths literals — parse drift?\n"
        f"  {reports_with_zero}"
    )
