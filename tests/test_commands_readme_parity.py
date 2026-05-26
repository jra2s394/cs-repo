"""Parity contract between `.claude/commands/*.md` and CLAUDE.md tables.

When a new command lands, three places must update in lock-step:
1. `.claude/commands/<name>.md` (the file)
2. A row in one of CLAUDE.md's command tables (`| /name |`)
3. The USER_GUIDE.md quick-reference (separately enforced — this file
   only covers CLAUDE.md)

Without this test, CI is green after step 1 but the command is invisible
to anyone reading the CLAUDE.md inventory. Past contributors (and Claude
itself, in COMMAND_GUIDE.md) have referenced a parity test that didn't
exist — this file makes the claim true.

Allow-list rules: a name appearing in CLAUDE.md but not as a file is
only OK if it's a documented exception (built-in slash command like
`/mcp`, or a literal prose placeholder like `/command-name` used as
template syntax). Anything else is drift.
"""
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
COMMANDS_DIR = REPO_ROOT / ".claude" / "commands"

# Slash-command refs in CLAUDE.md that don't (and shouldn't) map to a
# file in `.claude/commands/`. Each entry needs a one-line `why`.
ALLOWED_NON_FILE_REFS = {
    "mcp": "Built-in Claude Code command (shipped with the CLI, not authored here). See https://code.claude.com/docs/en/mcp",
    "tasks": "Historical reference — renamed to `/my-tasks` in round 60 to avoid collision with the Claude Code built-in `/tasks` (list background tasks). The historical mention stays in CLAUDE.md so teammates remember the rename rationale.",
    "agents": "Built-in Claude Code command for managing custom subagents (`/agents` opens the manager). Referenced from the round-79 Subagents section in CLAUDE.md. See https://code.claude.com/docs/en/sub-agents",
    "code-review": "Bundled Anthropic skill (not authored here) — separate from our `/review-code`. Referenced from the round-80 disambiguation callout in CLAUDE.md (and USER_GUIDE.md, but this test only walks CLAUDE.md). See https://code.claude.com/docs/en/commands",
    "skills": "Built-in Claude Code command for managing skills (`/skills` opens the picker; Space cycles a skill's `skillOverrides` value, Enter saves to `.claude/settings.local.json`). Referenced from the round-80 disambiguation callout in CLAUDE.md. See https://code.claude.com/docs/en/skills",
}

# Pattern: backtick-wrapped slash command in markdown table or prose.
# Matches `/at-risk`, `/story-CSEng`, `/intercom-yeartodate`. Does NOT
# match arguments like `/health-score Acme` (the regex stops at the
# closing backtick, and only the bare command-name backtick form is
# considered registered).
CMD_REF_RE = re.compile(r"`/([A-Za-z][A-Za-z0-9_-]*)`")


def _commands_from_files() -> set[str]:
    """Return the set of slash-command names that have a `.claude/commands/<name>.md` file."""
    return {p.stem for p in COMMANDS_DIR.glob("*.md")}


def _commands_from_claude_md() -> set[str]:
    """Return the set of slash-command names referenced in CLAUDE.md (any `/<name>` in backticks)."""
    text = CLAUDE_MD.read_text(encoding="utf-8")
    return set(CMD_REF_RE.findall(text))


def test_every_command_file_appears_in_claude_md():
    """Every `.claude/commands/<name>.md` must appear as a `/<name>` ref in CLAUDE.md.

    Without this, a new command is invisible to anyone reading CLAUDE.md's
    inventory tables — they only find it via `/commands` runtime auto-discovery.
    """
    files = _commands_from_files()
    in_md = _commands_from_claude_md()
    missing = sorted(files - in_md)
    assert not missing, (
        f"{len(missing)} command file(s) have no `/<name>` reference in CLAUDE.md:\n"
        + "\n".join(f"  - {n} (file: .claude/commands/{n}.md)" for n in missing)
        + "\n\nAdd a row to the appropriate command table in CLAUDE.md."
    )


def test_every_claude_md_ref_resolves_to_a_file_or_allowlist():
    """Every `/<name>` ref in CLAUDE.md must either map to a file or be in the allow-list.

    The allow-list (ALLOWED_NON_FILE_REFS at the top of this file) covers
    built-in Claude Code commands and prose placeholders. A new entry
    needs a one-line `why` documenting why the ref isn't a real command file.
    """
    files = _commands_from_files()
    in_md = _commands_from_claude_md()
    unaccounted = sorted(in_md - files - set(ALLOWED_NON_FILE_REFS))
    assert not unaccounted, (
        f"{len(unaccounted)} `/<name>` ref(s) in CLAUDE.md have no command file "
        f"and aren't in the allow-list:\n"
        + "\n".join(f"  - /{n}" for n in unaccounted)
        + "\n\nEither create `.claude/commands/<name>.md`, fix the typo in CLAUDE.md, "
        "or add `{name!r}` to ALLOWED_NON_FILE_REFS at the top of this test file "
        "with a one-line `why`."
    )


def test_allowlist_entries_are_actually_referenced():
    """An allow-list entry that nobody references is dead code — remove it.

    Catches the case where someone allow-lists a name preemptively and the
    reference never lands, or where the reference is removed but the
    allow-list entry stays behind.
    """
    in_md = _commands_from_claude_md()
    unused = sorted(set(ALLOWED_NON_FILE_REFS) - in_md)
    assert not unused, (
        f"{len(unused)} allow-list entries are no longer referenced in CLAUDE.md:\n"
        + "\n".join(f"  - {n}" for n in unused)
        + "\n\nRemove them from ALLOWED_NON_FILE_REFS at the top of this test file."
    )


def test_claude_md_and_commands_dir_both_exist():
    """Catches the 'everything got deleted' failure mode."""
    assert CLAUDE_MD.is_file(), f"{CLAUDE_MD} not found"
    assert COMMANDS_DIR.is_dir(), f"{COMMANDS_DIR} not found"
    files = _commands_from_files()
    assert len(files) > 0, "no command files in .claude/commands/"
