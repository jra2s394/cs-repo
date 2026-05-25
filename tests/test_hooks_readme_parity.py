"""Every hook script in `hooks/` must be documented in `hooks/README.md`.

Round-17 found `branch-enforcer.py` and `secret-scan.py` shipping for months
without a README entry — silent doc drift that would mislead any reader
trying to understand what guardrails this repo provides.

This test asserts:
  1. Every `hooks/*.py` (except internal helpers like `_git.py`) appears in
     the Hook Reference table near the top of the README.
  2. Every `hooks/*.py` (except internal helpers) appears as an `### <name>`
     section in the Individual Hook Docs block.

Internal helpers — files starting with `_` — are excluded by convention.
"""
import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
HOOKS_DIR = REPO_ROOT / "hooks"
README = HOOKS_DIR / "README.md"


def _public_hooks() -> set[str]:
    """Every `*.py` in hooks/ that isn't an internal helper (`_*.py`)."""
    return {
        p.name for p in HOOKS_DIR.glob("*.py")
        if not p.name.startswith("_")
    }


def _readme_text() -> str:
    return README.read_text(encoding="utf-8")


def test_every_hook_in_reference_table():
    text = _readme_text()
    # Reference rows look like: | `hookname.py` | event | description |
    referenced = set(re.findall(r"\|\s*`([a-zA-Z0-9_-]+\.py)`\s*\|", text))
    missing = _public_hooks() - referenced
    assert not missing, (
        f"hooks/README.md Hook Reference table is missing these hooks:\n"
        f"  {sorted(missing)}\n"
        f"Add a `| `<name>.py` | <event> | <one-line description> |` row "
        f"to the table near the top of hooks/README.md."
    )


def test_every_hook_has_individual_docs_section():
    text = _readme_text()
    # Section headers look like: ### `hookname.py`
    sectioned = set(re.findall(r"^###\s+`([a-zA-Z0-9_-]+\.py)`\s*$", text, re.MULTILINE))
    missing = _public_hooks() - sectioned
    assert not missing, (
        f"hooks/README.md Individual Hook Docs section is missing these hooks:\n"
        f"  {sorted(missing)}\n"
        f"Add a `### `<name>.py`` section to hooks/README.md with "
        f"**What it does**, **Event**, and **Customize** paragraphs."
    )


def test_at_least_one_hook_documented():
    """Sanity: if either query returns nothing, the parser drifted."""
    text = _readme_text()
    assert re.search(r"\|\s*`[a-zA-Z0-9_-]+\.py`\s*\|", text), \
        "hooks/README.md has no Hook Reference table rows — parse drift?"
    assert re.search(r"^###\s+`[a-zA-Z0-9_-]+\.py`", text, re.MULTILINE), \
        "hooks/README.md has no Individual Hook Docs sections — parse drift?"
