"""Tests for hooks/block-attribution.py

Verifies every blocked attribution pattern, case-insensitivity,
and that non-commit commands pass through unchanged.

Exit code 2 = blocked, 0 = allowed.
"""
import pytest
from tests.conftest import run_hook, bash_input

HOOK = "block-attribution.py"


def allows(command: str) -> bool:
    code, _, _ = run_hook(HOOK, bash_input(command))
    return code == 0


def blocks(command: str) -> bool:
    code, _, _ = run_hook(HOOK, bash_input(command))
    return code == 2


# ---------------------------------------------------------------------------
# Blocked attribution strings
# ---------------------------------------------------------------------------

class TestBlockedPatterns:
    def test_co_authored_by_claude(self):
        assert blocks('git commit -m "fix\\n\\nCo-Authored-By: Claude Sonnet"')

    def test_co_authored_by_anthropic(self):
        assert blocks('git commit -m "fix\\n\\nCo-Authored-By: Anthropic"')

    def test_generated_with_claude_code(self):
        assert blocks('git commit -m "Generated with Claude Code"')

    def test_generated_with_claude(self):
        assert blocks('git commit -m "Generated with Claude"')

    def test_noreply_anthropic_email(self):
        assert blocks('git commit -m "fix\\n\\nnoreply@anthropic.com"')

    def test_co_authored_claude_noreply(self):
        assert blocks(
            'git commit -m "fix\\n\\nCo-Authored-By: Claude <noreply@anthropic.com>"'
        )


class TestCaseInsensitivity:
    def test_uppercase_co_authored(self):
        assert blocks('git commit -m "CO-AUTHORED-BY: CLAUDE"')

    def test_mixed_case_generated(self):
        assert blocks('git commit -m "Generated With Claude Code"')

    def test_all_caps_anthropic_email(self):
        assert blocks('git commit -m "NOREPLY@ANTHROPIC.COM"')


# ---------------------------------------------------------------------------
# Clean commit messages — must not be blocked
# ---------------------------------------------------------------------------

class TestAllowedCommits:
    def test_clean_fix_message(self):
        assert allows('git commit -m "fix: correct off-by-one in kpiStrip"')

    def test_clean_feat_message(self):
        assert allows('git commit -m "feat: add stacked bar chart helper"')

    def test_clean_docs_message(self):
        assert allows('git commit -m "docs: update CLAUDE.md"')

    def test_multiline_clean_message(self):
        assert allows('git commit -m "chore: cleanup\\n\\nRemoved unused imports."')

    def test_message_mentioning_claude_in_context(self):
        # "Claude Code" in a non-attribution context (e.g., bug report) should be fine
        # The hook only looks for "generated with claude" or "co-authored-by: claude"
        assert allows('git commit -m "fix: Claude Code review findings"')


# ---------------------------------------------------------------------------
# Non-commit commands — must pass through immediately
# ---------------------------------------------------------------------------

class TestNonCommitCommands:
    def test_git_log(self):
        assert allows("git log --oneline")

    def test_git_status(self):
        assert allows("git status")

    def test_git_diff(self):
        assert allows("git diff HEAD")

    def test_git_push(self):
        # push is not a commit — branch-enforcer and push-guard handle it
        assert allows("git push origin feature/test")

    def test_ls(self):
        assert allows("ls -la")


# ---------------------------------------------------------------------------
# Malformed input
# ---------------------------------------------------------------------------

class TestMalformedInput:
    def test_empty_string(self):
        code, _, _ = run_hook(HOOK, "")
        assert code == 0

    def test_invalid_json(self):
        code, _, _ = run_hook(HOOK, "not json")
        assert code == 0

    def test_missing_command(self):
        code, _, _ = run_hook(HOOK, {"tool_input": {}})
        assert code == 0
