#!/usr/bin/env python3
"""Block git push and destructive GitHub CLI operations.

Prevents Claude from pushing to remote repositories or merging PRs
automatically. These actions affect shared state and should always
be performed manually by the developer.

Customize:
  - Add entries to `blocked` to restrict additional commands
    (e.g. "gh release create", "git push --force").
  - Remove entries from `blocked` if you want to allow certain operations
    (e.g. you may want to allow non-force pushes to feature branches).
  - Adjust the error message to reference your team's push policy.
"""
import sys
import json
import os
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _git import is_git_push, push_targets_protected_branch  # noqa: E402

try:
    data = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

command = (data.get("tool_input") or {}).get("command", "")


def reject(label: str) -> None:
    print(
        f"BLOCKED: '{label}' is not allowed. "
        "Push and merge operations must be performed manually. "
        "Stage your changes and push from your terminal.",
        file=sys.stderr,
    )
    sys.exit(2)


# ---------------------------------------------------------------------------
# Protected-branch / force push — delegated to _git.py so all the refspec
# forms (`+main`, `HEAD:main`, `refs/heads/main`, `:main`) are covered, and
# global git options (`git -c key=val push`, `git --no-pager push`) don't
# slip past the regex.
# ---------------------------------------------------------------------------
if is_git_push(command):
    if re.search(r"\bpush\b[^\n;|&]*?(?:--force(?![\w-])|--force-with-lease|\s-f\b)", command):
        reject("git push --force")
    if push_targets_protected_branch(command):
        reject("git push to a protected branch (main/master)")


# ---------------------------------------------------------------------------
# Each entry is (regex_pattern, human_readable_label).
# Add or remove entries here to control what is blocked.
# ---------------------------------------------------------------------------
blocked = [
    (r"gh\s+pr\s+merge", "gh pr merge"),
    (r"gh\s+repo\s+edit\s+.*--visibility\s+public", "gh repo edit --visibility public"),

    # Bash-level writes to .env files that bypass file-protector (which only
    # guards Edit/Write tools). Matches bare .env and directory-prefixed
    # variants. Excludes .envrc (direnv) by requiring `.env` is not followed
    # by a letter, and excludes safe template suffixes (.example/.sample/.template).
    (r"[>|]\s*(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "redirect to .env"),
    (r"\bcp\s+.*\s+(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "cp to .env"),
    (r"\bmv\s+.*\s+(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "mv to .env"),

    # tee — the option flags between `tee` and the target must be consumed
    # explicitly (`-a`, `-i`, etc.) so the greedy `.*` doesn't eat the path.
    (r"\|\s*tee\s+(?:-\S+\s+)*(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "pipe to tee .env"),

    # install(1) — coreutils file installer that can write arbitrary content
    # to a destination path. Permissive about intermediate tokens because
    # some options take arguments (e.g. `install -m 600 src dst`).
    (r"\binstall\s+(?:\S+\s+)*?(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "install to .env"),

    # dd of=.env — dd writing to .env regardless of where `of=` appears.
    (r"\bdd\s+(?:\S+\s+)*of=(?:\S+/)?\.env(?![a-zA-Z])(?!\.(example|sample|template))", "dd of=.env"),
]

for pattern, label in blocked:
    if re.search(pattern, command):
        reject(label)

sys.exit(0)
