"""Tests for hooks/notify.py

Verifies the notification hook always exits 0 (non-blocking),
emits a terminal bell to stderr, and tolerates a missing notifier
binary or unreadable stdin without crashing.
"""
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent
HOOK = REPO_ROOT / "hooks" / "notify.py"


def run(stdin_text="", env_path=None):
    env = os.environ.copy()
    if env_path is not None:
        env["PATH"] = env_path
    result = subprocess.run(
        [sys.executable, str(HOOK)],
        input=stdin_text,
        capture_output=True,
        text=True,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


class TestExitCode:
    def test_exits_zero_with_no_input(self):
        code, _, _ = run("")
        assert code == 0

    def test_exits_zero_with_empty_json(self):
        code, _, _ = run("{}")
        assert code == 0

    def test_exits_zero_with_garbage_input(self):
        code, _, _ = run("not json at all !!!")
        assert code == 0


class TestTerminalBell:
    def test_emits_bell_to_stderr(self):
        _, _, stderr = run("")
        assert "\a" in stderr

    def test_bell_emitted_even_with_empty_path(self):
        # osascript missing → FileNotFoundError → still exits clean and rings bell
        _, _, stderr = run("", env_path="")
        assert "\a" in stderr


class TestNoNotifierBinary:
    def test_no_crash_when_osascript_missing(self):
        # Empty PATH means osascript can't be found; hook should swallow error.
        code, _, _ = run("", env_path="")
        assert code == 0
