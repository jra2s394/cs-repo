"""Shared stdin-JSON parsing helper for hooks that must not block on failure.

Six of our PreToolUse and PostToolUse hooks have the same boilerplate:

    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

The "exit 0 on parse failure" semantics is deliberate: a safety hook that
can't parse its input must never block a tool call — the worst it should
do is skip its own check and let the tool proceed. Centralizing the
pattern means there's only one place to keep the failure semantics
consistent across audit-log, block-attribution, branch-enforcer,
push-guard, file-protector, and secret-scan.

Hooks with different semantics (e.g., `pr-template-reminder.py` falls
through with `{}` instead of exiting; `session-to-obsidian.py` does its
own Path-handling main flow) keep their own parsing — the cost of a
second helper isn't worth it for one or two users.
"""
import json
import sys


def parse_or_exit() -> dict:
    """Parse stdin as JSON and return a dict, or `sys.exit(0)` on failure.

    Used by safety hooks that must skip silently when stdin is malformed,
    empty, or otherwise unreadable. Never returns on failure; the caller
    can assume the return value is a usable dict.
    """
    try:
        return json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)
