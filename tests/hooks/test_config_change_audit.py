"""Tests for hooks/config-change-audit.py

Verifies log file creation, entry format, non-blocking behavior on errors,
and log rotation at 5 MB. Pattern after test_audit_log.py.
"""
import os
import json
import pytest

HOOK = "config-change-audit.py"


@pytest.fixture()
def isolated_home(tmp_path, monkeypatch):
    """Redirect HOME so the hook writes to a temp directory, not ~/.claude."""
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
            {"session_id": "abc12345", "cwd": "/project",
             "matcher": "project_settings",
             "hook_event_name": "ConfigChange"},
            isolated_home,
        )
        assert code == 0

    def test_log_file_created(self, isolated_home):
        run_audit(
            {"session_id": "abc12345", "cwd": "/project",
             "matcher": "project_settings"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "config-change.log"
        assert log_path.exists()

    def test_log_entry_contains_matcher(self, isolated_home):
        run_audit(
            {"session_id": "abc12345", "cwd": "/project",
             "matcher": "project_settings"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "config-change.log"
        content = log_path.read_text()
        assert "project_settings" in content

    def test_log_entry_format_has_pipes(self, isolated_home):
        run_audit(
            {"session_id": "abc12345", "cwd": "/project",
             "matcher": "local_settings"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "config-change.log"
        line = log_path.read_text().strip().split("\n")[0]
        # Format: "YYYY-MM-DD HH:MM:SS | sessid | matcher | cwd"
        parts = line.split(" | ")
        assert len(parts) == 4
        assert parts[1] == "abc12345"
        assert parts[2] == "local_settings"
        assert parts[3] == "/project"

    def test_multiple_calls_append(self, isolated_home):
        for matcher in ("project_settings", "local_settings", "skills"):
            run_audit(
                {"session_id": "abc12345", "cwd": "/project",
                 "matcher": matcher},
                isolated_home,
            )
        log_path = isolated_home / ".claude" / "config-change.log"
        lines = [ln for ln in log_path.read_text().strip().split("\n") if ln]
        assert len(lines) == 3

    def test_session_id_truncated_to_8(self, isolated_home):
        run_audit(
            {"session_id": "deadbeef1234567890", "cwd": "/x",
             "matcher": "project_settings"},
            isolated_home,
        )
        log_path = isolated_home / ".claude" / "config-change.log"
        content = log_path.read_text()
        assert "deadbeef" in content
        assert "deadbeef1234" not in content


class TestHardening:
    """Pin the same hardening as audit-log.py: atomic rotation, fail-safe
    size check, and explicit None handling for session_id.
    """

    def test_explicit_none_session_id_handled(self, isolated_home):
        # JSON payload with `"session_id": null` would crash a naive
        # `.get(..., "unknown")[:8]` chain because get returns None,
        # not the default. The hook uses `(... or "unknown")` to handle this.
        code, _, _ = run_audit(
            {"session_id": None, "cwd": "/x", "matcher": "project_settings"},
            isolated_home,
        )
        assert code == 0
        log_path = isolated_home / ".claude" / "config-change.log"
        assert "unknown" in log_path.read_text()

    def test_missing_matcher_handled(self, isolated_home):
        # Some ConfigChange events might omit `matcher`. Hook falls
        # back to `source`, then `unknown`. No crash either way.
        code, _, _ = run_audit(
            {"session_id": "abc12345", "cwd": "/x"},
            isolated_home,
        )
        assert code == 0
        log_path = isolated_home / ".claude" / "config-change.log"
        assert "unknown" in log_path.read_text()


class TestLogRotation:
    def test_log_rotated_when_over_5mb(self, isolated_home):
        log_path = isolated_home / ".claude" / "config-change.log"
        # Create a fake log file over 5 MB
        log_path.write_bytes(b"x" * (5 * 1024 * 1024 + 1))
        run_audit(
            {"session_id": "abc12345", "cwd": "/x",
             "matcher": "project_settings"},
            isolated_home,
        )
        archive = isolated_home / ".claude" / "config-change.log.1"
        assert archive.exists(), "Archive file should be created on rotation"
        # New log should be much smaller than 5 MB
        assert log_path.stat().st_size < 5 * 1024 * 1024


class TestNonBlockingOnError:
    """Audit hook must NEVER block — failures stay silent."""

    def test_invalid_json_exits_zero(self, isolated_home):
        code, _, _ = run_audit("not json", isolated_home)
        assert code == 0

    def test_empty_input_exits_zero(self, isolated_home):
        code, _, _ = run_audit("", isolated_home)
        assert code == 0

    def test_empty_dict_exits_zero(self, isolated_home):
        code, _, _ = run_audit({}, isolated_home)
        assert code == 0
