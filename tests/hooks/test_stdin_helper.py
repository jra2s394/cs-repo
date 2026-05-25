"""Tests for hooks/_stdin.py — the shared parse_or_exit helper.

Six safety hooks (audit-log, block-attribution, branch-enforcer,
push-guard, file-protector, secret-scan) rely on this helper to parse
their stdin payload. The contract is:
  - Valid JSON dict → returned as-is
  - Any parse failure → sys.exit(0), so the hook is skipped without
    blocking the tool call it was meant to inspect

The hooks themselves are subprocess-tested elsewhere; these tests pin
the helper contract so a refactor can't accidentally change the
fail-open semantics.
"""
import importlib.util
import io
from pathlib import Path

import pytest

HOOKS_DIR = Path(__file__).parent.parent.parent / "hooks"


def _load_stdin_helper():
    """Load hooks/_stdin.py as a module (the leading underscore prevents
    normal sibling-package import the way `_git.py` works for sibling hooks).
    """
    spec = importlib.util.spec_from_file_location(
        "hooks_stdin_helper", str(HOOKS_DIR / "_stdin.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def stdin_helper():
    return _load_stdin_helper()


def test_parses_valid_json(stdin_helper, monkeypatch):
    monkeypatch.setattr("sys.stdin", io.StringIO('{"tool_name": "Bash", "cwd": "/x"}'))
    data = stdin_helper.parse_or_exit()
    assert data == {"tool_name": "Bash", "cwd": "/x"}


def test_exits_zero_on_invalid_json(stdin_helper, monkeypatch):
    monkeypatch.setattr("sys.stdin", io.StringIO("not json"))
    with pytest.raises(SystemExit) as exc:
        stdin_helper.parse_or_exit()
    assert exc.value.code == 0


def test_exits_zero_on_empty_stdin(stdin_helper, monkeypatch):
    monkeypatch.setattr("sys.stdin", io.StringIO(""))
    with pytest.raises(SystemExit) as exc:
        stdin_helper.parse_or_exit()
    assert exc.value.code == 0


def test_parses_empty_dict(stdin_helper, monkeypatch):
    # `{}` is valid JSON — should return an empty dict, NOT exit. This
    # distinguishes "parse succeeded with no fields" from "parse failed".
    monkeypatch.setattr("sys.stdin", io.StringIO("{}"))
    data = stdin_helper.parse_or_exit()
    assert data == {}
