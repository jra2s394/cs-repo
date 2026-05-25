#!/usr/bin/env python3
"""Block git commits directly on protected branches.

Enforces the feature-branch workflow: all commits must happen on a
feature branch, never directly on main or master. This keeps the main
branch clean and ensures every change goes through a PR.

Customize:
  - Add branch names to `protected` to protect additional branches
    (e.g. "develop", "production", "release").
  - Remove entries if your workflow allows direct commits to a branch.
"""
import subprocess
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _git import is_git_commit  # noqa: E402
from _stdin import parse_or_exit  # noqa: E402

data = parse_or_exit()

command = (data.get("tool_input") or {}).get("command", "")

if not is_git_commit(command):
    sys.exit(0)

try:
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
        timeout=5,
    )
    current_branch = result.stdout.strip()
except Exception:
    sys.exit(0)

protected = ["main", "master"]

if current_branch in protected:
    print(
        f"BLOCKED: Commits directly on '{current_branch}' are not allowed. "
        "Create a feature branch first: git checkout -b <branch-name>",
        file=sys.stderr,
    )
    sys.exit(2)

sys.exit(0)
