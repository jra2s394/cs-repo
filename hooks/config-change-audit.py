#!/usr/bin/env python3
"""Append a timestamped line to a config-change log on every config edit.

ConfigChange fires when a configuration file changes during a Claude
Code session — `.claude/settings.json` (project_settings),
`.claude/settings.local.json` (local_settings),
`~/.claude/settings.json` (user_settings), policy_settings, or any
skill/agent frontmatter.

Per https://code.claude.com/docs/en/security:
  > "Audit or block settings changes during sessions with ConfigChange
  > hooks."

This hook is the AUDIT half — non-blocking, append-only, never
interferes with the change itself. It exists to create a forensic
trail: every config edit during a session leaves a line in
`~/.claude/config-change.log` so a post-incident review can answer
"what did this session change?".

Log line format: `timestamp | session_id (8 char) | matcher | cwd`.

To convert this hook to a BLOCKING audit (refuse any config change
mid-session), change the final `sys.exit(0)` to `sys.exit(2)` — be
aware this will reject every settings.json edit Claude or the user
attempts, including the ones the user explicitly wants. Most teams
want the audit half, not the block half.

Customize:
  - Change `log_path` to write logs elsewhere.
  - Add fields from the `data` dict (e.g., `transcript_path`,
    `permission_mode`) for richer per-event detail.
  - Rotate at a different size by editing `max_bytes`.
"""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _stdin import parse_or_exit

data = parse_or_exit()

session_id = (data.get("session_id") or "unknown")[:8]
cwd = data.get("cwd", "unknown")
# `matcher` identifies which config source changed: project_settings,
# local_settings, user_settings, policy_settings, or skills. This is
# the most useful field for forensic review.
matcher = data.get("matcher") or data.get("source") or "unknown"
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

log_path = os.path.expanduser("~/.claude/config-change.log")
max_bytes = 5 * 1024 * 1024  # 5 MB

try:
    # Atomic rotation: os.replace is atomic on POSIX, so a concurrent
    # rotator either succeeds first or finds the file already gone —
    # no TOCTOU race that drops records. Same pattern as audit-log.py.
    try:
        if os.path.getsize(log_path) > max_bytes:
            os.replace(log_path, log_path + ".1")
    except FileNotFoundError:
        pass  # already rotated by another process, or never existed

    # Single os.write on an O_APPEND fd is atomic for sub-PIPE_BUF
    # payloads (4 KB on Linux/macOS), so parallel hook invocations
    # can't interleave mid-line. Avoids Python's buffered I/O entirely.
    entry = f"{timestamp} | {session_id} | {matcher} | {cwd}\n".encode()
    fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(fd, entry)
    finally:
        os.close(fd)
except Exception:
    pass  # Never block on audit failure

sys.exit(0)
