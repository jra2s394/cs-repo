"""Cross-OS parity for scripts/setup-desktop.{sh,ps1}.

The Mac and Windows installers must create the same set of `~/Desktop/CS Reports/`
subfolders. PR #78 found these had drifted (Windows only made 3 of 6) and the
gap silently broke `copyToDesktop` for half the report categories on Windows.

This test parses both scripts and compares the folder set so future drift fails
in CI instead of in a teammate's Desktop.
"""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SH = REPO_ROOT / "scripts" / "setup-desktop.sh"
PS1 = REPO_ROOT / "scripts" / "setup-desktop.ps1"


def _sh_folders() -> set[str]:
    """Folders created by setup-desktop.sh via `mkdir -p "$REPORTS_DIR/<name>"`."""
    text = SH.read_text(encoding="utf-8")
    return set(re.findall(r'mkdir\s+-p\s+"\$REPORTS_DIR/([^"]+)"', text))


def _ps1_folders() -> set[str]:
    """Folders created by setup-desktop.ps1 via the `foreach ($sub in ...)` loop."""
    text = PS1.read_text(encoding="utf-8")
    m = re.search(r'foreach\s*\(\s*\$sub\s+in\s+(.+?)\)\s*\{', text)
    assert m, "could not locate the foreach loop in setup-desktop.ps1"
    return set(re.findall(r'"([^"]+)"', m.group(1)))


def test_sh_and_ps1_create_same_folder_set():
    sh = _sh_folders()
    ps1 = _ps1_folders()
    assert sh == ps1, (
        f"setup-desktop.sh and .ps1 create different folder sets:\n"
        f"  only in .sh:  {sorted(sh - ps1)}\n"
        f"  only in .ps1: {sorted(ps1 - sh)}\n"
        f"Both scripts must stay in sync — copyToDesktop silently no-ops "
        f"when the destination folder doesn't exist (see lib/copy-to-desktop.js:16)."
    )


def test_both_scripts_create_at_least_one_folder():
    """Sanity: regression check in case the parsing breaks silently."""
    assert _sh_folders(), "setup-desktop.sh appears to create no folders — parse drift?"
    assert _ps1_folders(), "setup-desktop.ps1 appears to create no folders — parse drift?"
