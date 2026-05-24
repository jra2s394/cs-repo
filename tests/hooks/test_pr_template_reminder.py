"""Tests for hooks/pr-template-reminder.py

Verifies that the hook:
  - injects context when the user mentions a PR AND a template exists
  - stays silent when no PR intent is detected
  - stays silent when the template file doesn't exist
  - handles malformed input gracefully
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HOOK = "pr-template-reminder.py"
HOOKS_DIR = Path(__file__).parent.parent.parent / "hooks"
TEMPLATE_CONTENT = "## Summary\n\n## Test plan\n"


@pytest.fixture()
def repo_with_template(tmp_path):
    """A temp directory that has a .github/pull_request_template.md."""
    (tmp_path / ".github").mkdir()
    (tmp_path / ".github" / "pull_request_template.md").write_text(TEMPLATE_CONTENT)
    return tmp_path


@pytest.fixture()
def repo_without_template(tmp_path):
    """A temp directory with no PR template."""
    return tmp_path


def run_pr_hook(message: str, cwd: Path) -> tuple[int, str, str]:
    """Run pr-template-reminder.py with the given user message, in the given cwd."""
    stdin_data = json.dumps({"prompt": message})
    result = subprocess.run(
        [sys.executable, str(HOOKS_DIR / HOOK)],
        input=stdin_data,
        capture_output=True,
        text=True,
        cwd=str(cwd),
    )
    return result.returncode, result.stdout, result.stderr


class TestInjectsWhenTemplateExists:
    def test_create_pr_triggers_injection(self, repo_with_template):
        _, stdout, _ = run_pr_hook("create a PR for my changes", repo_with_template)
        assert stdout.strip() != ""
        data = json.loads(stdout)
        assert "hookSpecificOutput" in data

    def test_open_pull_request_triggers_injection(self, repo_with_template):
        _, stdout, _ = run_pr_hook("open a pull request for this branch", repo_with_template)
        data = json.loads(stdout)
        assert data["hookSpecificOutput"]["hookEventName"] == "UserPromptSubmit"

    def test_gh_pr_create_triggers_injection(self, repo_with_template):
        _, stdout, _ = run_pr_hook("gh pr create --title 'fix'", repo_with_template)
        assert stdout.strip() != ""

    def test_draft_pr_triggers_injection(self, repo_with_template):
        _, stdout, _ = run_pr_hook("draft a pull request", repo_with_template)
        assert stdout.strip() != ""

    def test_injection_mentions_template_path(self, repo_with_template):
        _, stdout, _ = run_pr_hook("create a PR", repo_with_template)
        context = json.loads(stdout)["hookSpecificOutput"]["additionalContext"]
        assert "pull_request_template" in context

    def test_injection_says_mandatory(self, repo_with_template):
        _, stdout, _ = run_pr_hook("create a PR", repo_with_template)
        context = json.loads(stdout)["hookSpecificOutput"]["additionalContext"]
        assert "mandatory" in context.lower() or "must" in context.lower()

    def test_exits_zero_with_template(self, repo_with_template):
        code, _, _ = run_pr_hook("create a PR", repo_with_template)
        assert code == 0


class TestSilentWhenNoTemplate:
    def test_pr_intent_no_template_is_silent(self, repo_without_template):
        _, stdout, _ = run_pr_hook("create a PR for my changes", repo_without_template)
        assert stdout.strip() == ""

    def test_exits_zero_no_template(self, repo_without_template):
        code, _, _ = run_pr_hook("create a PR", repo_without_template)
        assert code == 0


class TestSilentWhenNoPrIntent:
    def test_random_message_is_silent(self, repo_with_template):
        _, stdout, _ = run_pr_hook("run the daily standup", repo_with_template)
        assert stdout.strip() == ""

    def test_git_commit_is_silent(self, repo_with_template):
        _, stdout, _ = run_pr_hook("git commit my changes", repo_with_template)
        assert stdout.strip() == ""

    def test_fix_bug_is_silent(self, repo_with_template):
        _, stdout, _ = run_pr_hook("fix the bug in push-guard", repo_with_template)
        assert stdout.strip() == ""


class TestMalformedInput:
    def test_invalid_json_exits_zero(self, repo_with_template):
        result = subprocess.run(
            [sys.executable, str(HOOKS_DIR / HOOK)],
            input="not json at all",
            capture_output=True,
            text=True,
            cwd=str(repo_with_template),
        )
        assert result.returncode == 0

    def test_empty_input_exits_zero(self, repo_with_template):
        result = subprocess.run(
            [sys.executable, str(HOOKS_DIR / HOOK)],
            input="",
            capture_output=True,
            text=True,
            cwd=str(repo_with_template),
        )
        assert result.returncode == 0
