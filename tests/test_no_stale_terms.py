"""Fail CI if known stale terms reappear in committed docs.

Each entry below traces back to a past rename or scrub. The point isn't
to block every mention of a word — it's to lock in renames so a future
copy-paste from an old draft doesn't quietly resurrect the stale term.

To add a new rule:
  1. Pick the term and an allow_files set covering legitimate mentions
     (e.g. tests that intentionally exercise the term).
  2. Verify the rule is currently satisfied (`make test`).
  3. Document the why in the comment next to the entry.
"""
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent

# (term, glob, allow_files, why)
FORBIDDEN = [
    (
        "dotclaude",
        "**/*.md",
        # Allowed exceptions: RELEASE_NOTES.md (historical changelog
        # naturally references the rename when summarizing round-15).
        {"RELEASE_NOTES.md"},
        "Old working name. Repo is cs-repo. Scrubbed in PR #65 (install.sh) "
        "and PR #82 (examples/patterns).",
    ),
]

SEARCH_DIRS = ["CLAUDE.md", "README.md", "SECURITY.md", "SETUP.md", "TEAM_SETUP.md",
               "USER_GUIDE.md", "CONTRIBUTING.md", "RELEASE_NOTES.md",
               ".claude", "docs", "examples", "patterns", "prompts",
               "skills", "obsidian", "hooks", "lib", "reports", "scripts"]


def _files_to_scan(glob: str):
    """Yield real files matching glob under the audit-relevant directories.
    Excludes node_modules, .pytest_cache, .ruff_cache, .git, out/, data/outputs/.
    """
    excluded_prefixes = (".git/", "node_modules/", ".pytest_cache/", ".ruff_cache/",
                        "out/", "data/outputs/", "tests/test_no_stale_terms.py")
    for entry in SEARCH_DIRS:
        base = REPO_ROOT / entry
        if base.is_file():
            yield base
            continue
        if not base.is_dir():
            continue
        for p in base.rglob(glob.replace("**/", "")):
            if not p.is_file():
                continue
            rel = p.relative_to(REPO_ROOT).as_posix()
            if any(rel.startswith(x) for x in excluded_prefixes):
                continue
            yield p


@pytest.mark.parametrize("term,glob,allow_files,why", FORBIDDEN,
                         ids=lambda v: v if isinstance(v, str) else "")
def test_term_not_present(term, glob, allow_files, why):
    pattern = re.compile(re.escape(term), re.IGNORECASE)
    offenders = []
    for path in _files_to_scan(glob):
        rel = path.relative_to(REPO_ROOT).as_posix()
        if rel in allow_files:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for line_no, line in enumerate(text.splitlines(), 1):
            if pattern.search(line):
                offenders.append(f"  {rel}:{line_no}: {line.strip()[:120]}")
    assert not offenders, (
        f"Stale term `{term}` reappeared in committed files.\n"
        f"Why this is blocked: {why}\n"
        f"Offending lines:\n" + "\n".join(offenders[:20])
    )
