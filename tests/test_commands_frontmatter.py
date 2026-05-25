"""Frontmatter contract for .claude/commands/*.md

`/commands` and CLAUDE.md's command tables both rely on every command file
having a `---` frontmatter block with a non-empty `description:` field.
This test locks that contract in CI — adding a command without a
description (or with a placeholder) fails the build instead of silently
rotting the inventory.

Section 20 of /review-code points at this test for the automated portion
of the read-only / draft-first command contract checks.
"""
import re
from pathlib import Path

import pytest

COMMANDS_DIR = Path(__file__).parent.parent / ".claude" / "commands"
COMMAND_FILES = sorted(COMMANDS_DIR.glob("*.md"))

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---", re.DOTALL)
DESCRIPTION_RE = re.compile(r"^description:\s*(.+)$", re.MULTILINE)


def _read_frontmatter(path: Path) -> str:
    """Return the YAML between the opening and closing --- markers, or '' if missing."""
    content = path.read_text(encoding="utf-8")
    m = FRONTMATTER_RE.match(content)
    return m.group(1) if m else ""


def _description(fm: str) -> str:
    m = DESCRIPTION_RE.search(fm)
    return m.group(1).strip() if m else ""


def test_commands_directory_exists():
    assert COMMANDS_DIR.is_dir(), f"{COMMANDS_DIR} not found"


def test_at_least_one_command_exists():
    # Catches the "everything got deleted" failure mode
    assert len(COMMAND_FILES) > 0, "no command files in .claude/commands/"


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.name)
def test_has_frontmatter_block(path: Path):
    """Every command file must open with a `---` frontmatter block."""
    content = path.read_text(encoding="utf-8")
    assert content.startswith("---\n"), (
        f"{path.name}: missing opening `---` frontmatter delimiter"
    )
    assert FRONTMATTER_RE.match(content), (
        f"{path.name}: opening `---` not followed by a closing `---` "
        "(YAML frontmatter must be a closed block at the top of the file)"
    )


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.name)
def test_has_description_field(path: Path):
    """Frontmatter must declare a non-empty `description:` field."""
    fm = _read_frontmatter(path)
    assert fm, f"{path.name}: no frontmatter block"
    desc = _description(fm)
    assert desc, (
        f"{path.name}: frontmatter has no `description:` field, or it is empty. "
        "`/commands` and CLAUDE.md tables both rely on this field."
    )


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.name)
def test_description_is_meaningful(path: Path):
    """Description must be a real sentence — not a placeholder or stub."""
    desc = _description(_read_frontmatter(path))
    assert len(desc) >= 20, (
        f"{path.name}: description is only {len(desc)} chars "
        f"(min 20 to be a useful summary): {desc!r}"
    )
    lower = desc.lower()
    forbidden_starts = ("todo", "tbd", "wip", "placeholder", "fixme")
    for stub in forbidden_starts:
        assert not lower.startswith(stub), (
            f"{path.name}: description starts with '{stub}' — replace with the real summary"
        )
    # An ellipsis at the end signals an unfinished thought
    assert not desc.endswith("..."), (
        f"{path.name}: description ends with `...` — finish the sentence"
    )


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.name)
def test_description_is_single_line(path: Path):
    """Description must be a single line — `/commands` and CLAUDE.md render them in tables."""
    desc = _description(_read_frontmatter(path))
    assert "\n" not in desc, (
        f"{path.name}: description spans multiple lines — collapse to one line "
        "so it renders correctly in CLAUDE.md tables and /commands output"
    )


# ── argument-hint (optional) ────────────────────────────────────────────────
# Added round-26 after WebFetch'd the Claude Code skills doc surfaced this
# frontmatter field. Not all commands take args, so this field is OPTIONAL —
# but if present, it must follow the documented format so the autocomplete
# UI renders it correctly.

ARGUMENT_HINT_RE = re.compile(r"^argument-hint:\s*(.+)$", re.MULTILINE)


def _argument_hint(fm: str):
    """Return the argument-hint string, or None if not present."""
    m = ARGUMENT_HINT_RE.search(fm)
    if not m:
        return None
    value = m.group(1).strip()
    # Strip outer quotes (YAML accepts both '"..."' and unquoted forms, and
    # angle brackets in `<customer>` force the quoted form). Match what the
    # YAML parser would yield.
    if (value.startswith('"') and value.endswith('"')) or \
       (value.startswith("'") and value.endswith("'")):
        value = value[1:-1]
    return value


@pytest.mark.parametrize("path", COMMAND_FILES, ids=lambda p: p.name)
def test_argument_hint_format_when_present(path: Path):
    """If `argument-hint:` is set, it must be a single-line non-empty string.

    Per the Claude Code skills doc (https://code.claude.com/docs/en/skills),
    `argument-hint` is shown in the autocomplete UI to indicate expected
    arguments. Example values: `[issue-number]`, `[filename] [format]`,
    `<customer name>`. Multi-line hints would break the autocomplete render.
    """
    hint = _argument_hint(_read_frontmatter(path))
    if hint is None:
        return  # field is optional
    assert hint, f"{path.name}: argument-hint is present but empty"
    assert "\n" not in hint, (
        f"{path.name}: argument-hint spans multiple lines — must be a single "
        "line so the autocomplete UI renders it correctly"
    )
    # Encourage bracket notation so the hint reads as a placeholder, not as
    # narrative prose. Either `[...]` or `<...>` is fine; mixed is fine too.
    # Permissive — only fail on obviously-wrong shapes.
    assert any(c in hint for c in "[<"), (
        f"{path.name}: argument-hint={hint!r} doesn't use [...] or <...> "
        "bracket notation — Claude Code's autocomplete expects a placeholder shape"
    )
