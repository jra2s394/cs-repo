"""Shared fixtures and helpers for hook tests."""
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
HOOKS_DIR = REPO_ROOT / "hooks"


def run_hook(hook_name: str, stdin_data) -> tuple[int, str, str]:
    """Run a hook script with controlled stdin. Returns (returncode, stdout, stderr)."""
    stdin_str = json.dumps(stdin_data) if isinstance(stdin_data, dict) else stdin_data
    result = subprocess.run(
        [sys.executable, str(HOOKS_DIR / hook_name)],
        input=stdin_str,
        capture_output=True,
        text=True,
    )
    return result.returncode, result.stdout, result.stderr


def run_hook_in_dir(hook_name: str, stdin_data, cwd: Path) -> tuple[int, str, str]:
    """Run a hook in a specific working directory (needed for branch-enforcer)."""
    stdin_str = json.dumps(stdin_data) if isinstance(stdin_data, dict) else stdin_data
    result = subprocess.run(
        [sys.executable, str(HOOKS_DIR / hook_name)],
        input=stdin_str,
        capture_output=True,
        text=True,
        cwd=str(cwd),
    )
    return result.returncode, result.stdout, result.stderr


def bash_input(command: str) -> dict:
    """Build the JSON payload a PreToolUse hook receives for a Bash tool call."""
    return {"tool_name": "Bash", "tool_input": {"command": command}}


def edit_input(file_path: str) -> dict:
    """Build the JSON payload a PreToolUse hook receives for an Edit/Write tool call."""
    return {"tool_name": "Edit", "tool_input": {"file_path": file_path}}


def _init_repo_on_branch(path: Path, branch: str) -> Path:
    """Create a temp git repo with one commit on the given branch."""
    env = {**__import__("os").environ,
           "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "t@t.com",
           "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "t@t.com"}
    subprocess.run(["git", "init", "-b", branch], cwd=path,
                   check=True, capture_output=True)
    (path / "README.md").write_text("test")
    subprocess.run(["git", "add", "README.md"], cwd=path, check=True,
                   capture_output=True, env=env)
    subprocess.run(["git", "commit", "-m", "init"], cwd=path, check=True,
                   capture_output=True, env=env)
    return path


@pytest.fixture()
def main_branch_repo(tmp_path):
    """A temp git repo with one commit sitting on 'main'."""
    return _init_repo_on_branch(tmp_path, "main")


@pytest.fixture()
def feature_branch_repo(tmp_path):
    """A temp git repo with one commit sitting on 'feature/test-work'."""
    return _init_repo_on_branch(tmp_path, "feature/test-work")


@pytest.fixture()
def master_branch_repo(tmp_path):
    """A temp git repo with one commit sitting on 'master'."""
    return _init_repo_on_branch(tmp_path, "master")
