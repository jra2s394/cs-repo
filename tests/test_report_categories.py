"""Every `copyToDesktop` category in `reports/*.js` must map to a folder
created by `scripts/setup-desktop.sh` (and, by the parity test, `.ps1`).

If a new report category is added without updating the setup scripts, the
Desktop copy will silently no-op on every install — `copyToDesktop` skips
when the destination folder is missing. This test fails CI before the
gap reaches anyone's machine.
"""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
REPORTS_DIR = REPO_ROOT / "reports"
SH = REPO_ROOT / "scripts" / "setup-desktop.sh"

CATEGORY_RE = re.compile(r'category:\s*"([^"]+)"')
SH_FOLDER_RE = re.compile(r'mkdir\s+-p\s+"\$REPORTS_DIR/([^"]+)"')


def _categories_used() -> set[str]:
    """Every `category: "..."` value passed to publishReport across reports/*.js."""
    cats = set()
    for report in REPORTS_DIR.glob("*.js"):
        cats.update(CATEGORY_RE.findall(report.read_text(encoding="utf-8")))
    return cats


def _setup_folders() -> set[str]:
    return set(SH_FOLDER_RE.findall(SH.read_text(encoding="utf-8")))


def test_every_report_category_has_a_setup_folder():
    cats = _categories_used()
    folders = _setup_folders()
    missing = sorted(cats - folders)
    assert not missing, (
        f"reports/*.js uses category names that setup-desktop.sh does not create:\n"
        f"  missing folders: {missing}\n"
        f"Add `mkdir -p \"$REPORTS_DIR/<name>\"` for each in setup-desktop.sh "
        f"AND the matching loop entry in setup-desktop.ps1, or `copyToDesktop` "
        f"will silently no-op (see lib/copy-to-desktop.js:16)."
    )


def test_at_least_one_report_category_found():
    """Sanity: regression check in case the parsing breaks silently."""
    assert _categories_used(), "no copyToDesktop categories found — parse drift?"
