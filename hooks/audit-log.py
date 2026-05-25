#!/usr/bin/env python3
"""Log all tool usage to an audit file.

Appends tool name + timestamp to ~/.claude/tool-audit.log on every tool call.
Designed to be fast: just a file append, never blocks execution.

Customize:
  - Change `log_path` to write logs elsewhere.
  - Extend the log format to include additional fields from `data`
    (e.g., tool_input, hook event name).
"""
import os
import sys
import json
from datetime import datetime

try:
    data = json.load(sys.stdin)
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

tool_name = data.get("tool_name", "unknown")
session_id = (data.get("session_id") or "unknown")[:8]
cwd = data.get("cwd", "unknown")
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

log_path = os.path.expanduser("~/.claude/tool-audit.log")
max_bytes = 5 * 1024 * 1024  # 5 MB

try:
    # Atomic rotation: os.replace is atomic on POSIX (and Windows under Py 3.3+),
    # so a concurrent rotator either succeeds first or finds the file already
    # gone — no TOCTOU race that drops records. The size check stays
    # advisory: if it races with another rotator the replace may target an
    # already-rotated file, which is fine.
    try:
        if os.path.getsize(log_path) > max_bytes:
            os.replace(log_path, log_path + ".1")
    except FileNotFoundError:
        pass  # already rotated by another process, or never existed

    # Single os.write on an O_APPEND fd is atomic for sub-PIPE_BUF payloads
    # (4 KB on Linux/macOS), so parallel hook invocations can't interleave
    # mid-line. Avoids Python's buffered I/O entirely.
    entry = f"{timestamp} | {session_id} | {tool_name} | {cwd}\n".encode()
    fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(fd, entry)
    finally:
        os.close(fd)
except Exception:
    pass  # Never block on audit failure

sys.exit(0)
