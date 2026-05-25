"""Tests for hooks/audit-log.py

Verifies log file creation, entry format, non-blocking behavior on errors,
and log rotation at 5 MB.
"""
import os
import json
import time
import pytest
from tests.conftest import run_hook

HOOK = "audit-log.py"


@pytest.fixture()
def isolated_home(tmp_path, monkeypatch):
    """Redirect HOME so audit-log writes to a temp directory, not ~/.claude."""
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    (fake_home / ".claude").mkdir()
    monkeypatch.setenv("HOME", str(fake_home))
    return fake_home


def run_audit(stdin_data, isolated_home):
    """Run the hook with a patched HOME so the log goes to a temp path."""
    env = os.environ.copy()
    env["HOME"] = str(isolated_home)
    import subprocess
    import sys
    from pathlib import Path
    hooks_dir = Path(__file__).parent.parent.parent / "hooks"
    result = subprocess.run(
        [sys.executable, str(hooks_dir / HOOK)],
        input=json.dumps(stdin_data) if isinstance(stdin_data, dict) else stdin_data,
        capture_output=True,
        text=True,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


class TestBasicLogging:
    def test_exits_zero(self, isolated_home):
        code, _, _ = run_audit(
            {"tool_name": "Read", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        assert code == 0

    def test_log_file_created(self, isolated_home):
        run_audit(
            {"tool_name": "Bash", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        assert log_path.exists()

    def test_log_entry_contains_tool_name(self, isolated_home):
        run_audit(
            {"tool_name": "Edit", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        content = log_path.read_text()
        assert "Edit" in content

    def test_log_entry_contains_session_prefix(self, isolated_home):
        run_audit(
            {"tool_name": "Write", "session_id": "deadbeef1234", "cwd": "/project"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        content = log_path.read_text()
        # session_id is truncated to 8 chars
        assert "deadbeef" in content

    def test_log_entry_format_has_pipes(self, isolated_home):
        run_audit(
            {"tool_name": "Bash", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        line = log_path.read_text().strip().split("\n")[0]
        # Format: "YYYY-MM-DD HH:MM:SS | sessid | OK/FAIL | tool_name | cwd"
        parts = line.split(" | ")
        assert len(parts) == 5

    def test_multiple_calls_append(self, isolated_home):
        for tool in ("Read", "Bash", "Edit"):
            run_audit(
                {"tool_name": tool, "session_id": "abc12345", "cwd": "/project"},
                isolated_home,
            )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        lines = [ln for ln in log_path.read_text().strip().split("\n") if ln]
        assert len(lines) == 3


class TestStatusColumn:
    """The status column distinguishes successful tool calls (PostToolUse) from
    failures (PostToolUseFailure), so failed calls don't vanish from the audit
    trail. Anything not ending in 'Failure' is treated as OK.
    """

    def test_post_tool_use_logs_ok(self, isolated_home):
        run_audit(
            {
                "tool_name": "Bash",
                "session_id": "abc12345",
                "cwd": "/project",
                "hook_event_name": "PostToolUse",
            },
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        parts = log_path.read_text().strip().split(" | ")
        assert parts[2] == "OK"

    def test_post_tool_use_failure_logs_fail(self, isolated_home):
        run_audit(
            {
                "tool_name": "Bash",
                "session_id": "abc12345",
                "cwd": "/project",
                "hook_event_name": "PostToolUseFailure",
            },
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        parts = log_path.read_text().strip().split(" | ")
        assert parts[2] == "FAIL"

    def test_missing_event_name_defaults_to_ok(self, isolated_home):
        # Existing payload shape (no hook_event_name) must still log as OK,
        # since the historical PostToolUse hook never included the field.
        run_audit(
            {"tool_name": "Read", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "tool-audit.log"
        parts = log_path.read_text().strip().split(" | ")
        assert parts[2] == "OK"


class TestLogRotation:
    def test_log_rotated_when_over_5mb(self, isolated_home):
        log_path = isolated_home / ".claude" / "tool-audit.log"
        # Create a fake log file over 5 MB
        log_path.write_bytes(b"x" * (5 * 1024 * 1024 + 1))
        run_audit(
            {"tool_name": "Bash", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        archive = isolated_home / ".claude" / "tool-audit.log.1"
        assert archive.exists(), "Archive file should be created on rotation"
        # New log should be much smaller than 5 MB
        assert log_path.stat().st_size < 5 * 1024 * 1024

    def test_old_archive_replaced_on_second_rotation(self, isolated_home):
        log_path = isolated_home / ".claude" / "tool-audit.log"
        archive = isolated_home / ".claude" / "tool-audit.log.1"
        # Pre-create an existing archive
        archive.write_text("old archive content")
        log_path.write_bytes(b"x" * (5 * 1024 * 1024 + 1))
        run_audit(
            {"tool_name": "Bash", "session_id": "abc12345", "cwd": "/project"},
            isolated_home,
        )
        # Old archive should be replaced (overwritten or deleted)
        assert archive.exists()
        assert archive.read_text() != "old archive content"


class TestHardening:
    """Tests that pin the post-audit hardening so a regression can't slip
    back in: atomic rotation, fail-safe size check, and explicit None
    handling for session_id.
    """

    def test_rotation_survives_missing_log_file(self, isolated_home):
        # If the log file is gone between getsize check and our rotation
        # call (or simply never existed), the hook must not crash. With
        # plain os.rename this raised FileNotFoundError mid-handler.
        # Just calling the hook on an empty .claude/ dir exercises the path.
        code, _, _ = run_audit(
            {"tool_name": "Read", "session_id": "fresh000", "cwd": "/x"},
            isolated_home,
        )
        assert code == 0
        log_path = isolated_home / ".claude" / "tool-audit.log"
        # File was created by the append, not the rotation
        assert log_path.exists()

    def test_explicit_none_session_id_handled(self, isolated_home):
        # JSON payload with `"session_id": null` previously crashed the
        # `.get(..., "unknown")[:8]` chain because get returned None, not
        # the default. Now uses `(... or "unknown")`.
        code, _, _ = run_audit(
            {"tool_name": "Read", "session_id": None, "cwd": "/x"},
            isolated_home,
        )
        assert code == 0
        log_path = isolated_home / ".claude" / "tool-audit.log"
        assert "unknown" in log_path.read_text()


class TestNonBlockingOnError:
    def test_invalid_json_exits_zero(self, isolated_home):
        code, _, _ = run_audit("not json", isolated_home)
        assert code == 0

    def test_empty_input_exits_zero(self, isolated_home):
        code, _, _ = run_audit("", isolated_home)
        assert code == 0

    def test_missing_tool_name_exits_zero(self, isolated_home):
        code, _, _ = run_audit({}, isolated_home)
        assert code == 0
