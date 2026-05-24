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
import re

try:
    data = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

command = (data.get("tool_input") or {}).get("command", "")

# Each entry is (regex_pattern, human_readable_label).
# Add or remove entries here to control what is blocked.
blocked = [
    (r"git\s+push\s+.*--force", "git push --force"),
    (r"git\s+push\s+.*-f\b", "git push -f"),
    (r"gh\s+pr\s+merge", "gh pr merge"),
    (r"gh\s+repo\s+edit\s+.*--visibility\s+public", "gh repo edit --visibility public"),
    # Block direct pushes to protected branches — use a feature branch + PR instead
    # (?=\s|$) avoids false positives on branch names like "main-feature" or "mainstream"
    (r"git\s+push\s+(origin\s+)?main(?=\s|$)", "git push to main"),
    (r"git\s+push\s+(origin\s+)?master(?=\s|$)", "git push to master"),
    # Bash-level writes to .env files that bypass file-protector (which only guards Edit/Write tools)
    (r"[>|]\s*\.env(?!\.example|\.sample|\.template)", "redirect to .env"),
    (r"cp\s+.*\s+\.env(?!\.example|\.sample|\.template)", "cp to .env"),
    (r"mv\s+.*\s+\.env(?!\.example|\.sample|\.template)", "mv to .env"),
    (r"\|\s*tee\s+.*\.env(?!\.example|\.sample|\.template)", "pipe to tee .env"),
]

for pattern, label in blocked:
    if re.search(pattern, command):
        print(
            f"BLOCKED: '{label}' is not allowed. "
            "Push and merge operations must be performed manually. "
            "Stage your changes and push from your terminal.",
            file=sys.stderr,
        )
        sys.exit(2)

sys.exit(0)
