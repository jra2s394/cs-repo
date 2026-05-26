"""Tests for hooks/lint-after-edit.py — the PostToolUse verification hook.

The hook surfaces lint findings immediately after Claude edits a file,
non-blocking. Pins the contract that:
  - Clean files → silent (exit 0, no stderr)
  - Dirty files → exit 0, lint output on stderr
  - Non-matching extensions / missing files / outside-repo paths →
    silent (no spurious noise)
  - Hook is NEVER blocking (always exits 0)
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HOOK = "lint-after-edit.py"
HOOKS_DIR = Path(__file__).parent.parent.parent / "hooks"
REPO_ROOT = Path(__file__).parent.parent.parent


def run_lint(stdin_data) -> tuple[int, str, str]:
    """Invoke the hook with the given stdin payload."""
    stdin_str = json.dumps(stdin_data) if isinstance(stdin_data, dict) else stdin_data
    result = subprocess.run(
        [sys.executable, str(HOOKS_DIR / HOOK)],
        input=stdin_str,
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    return result.returncode, result.stdout, result.stderr


def edit_payload(file_path: str) -> dict:
    return {"tool_name": "Edit", "tool_input": {"file_path": file_path}}


class TestNonBlocking:
    """Whatever happens, this hook must never exit non-zero."""

    def test_clean_py_file_exits_zero(self, tmp_path):
        # A clean file under the repo's hook dir should pass ruff
        code, _, _ = run_lint(edit_payload(str(HOOKS_DIR / "_stdin.py")))
        assert code == 0

    def test_missing_file_exits_zero(self):
        code, _, stderr = run_lint(edit_payload("/tmp/does-not-exist.py"))
        assert code == 0
        assert stderr == ""

    def test_outside_repo_exits_zero(self):
        code, _, stderr = run_lint(edit_payload("/etc/hosts"))
        assert code == 0
        assert stderr == ""

    def test_non_py_non_js_exits_zero(self, tmp_path):
        # .md files aren't in LINTER_MAP, so silent skip
        md = tmp_path / "doc.md"
        md.write_text("# heading\n")
        code, _, stderr = run_lint(edit_payload(str(md)))
        assert code == 0
        assert stderr == ""

    def test_missing_tool_input_exits_zero(self):
        code, _, stderr = run_lint({"tool_name": "Edit"})
        assert code == 0
        assert stderr == ""

    def test_invalid_json_exits_zero(self):
        code, _, _ = run_lint("not json")
        assert code == 0


class TestSkipPrefixes:
    """Files under generated / cache / output dirs should be silently skipped."""

    @pytest.mark.parametrize("subdir", [
        "node_modules", ".venv", "__pycache__", ".pytest_cache",
        ".ruff_cache", "coverage", "out", "data/outputs",
    ])
    def test_skipped(self, subdir):
        # A .py path under one of these dirs should be silently skipped
        # even if the file doesn't actually exist (we don't reach the
        # linter to find out).
        path = REPO_ROOT / subdir / "fake.py"
        code, _, stderr = run_lint(edit_payload(str(path)))
        assert code == 0
        assert stderr == ""


class TestLintingFires:
    """When a real lintable file with real issues is passed, the hook should
    surface the issues on stderr."""

    def test_dirty_py_file_surfaces_issues(self, tmp_path):
        # Write a .py file with a known lint issue (unused import).
        # Put it inside the repo (not under SKIP_PREFIXES) so ruff actually
        # checks it. Use lib/ which is in ruff.toml's include list.
        bad = REPO_ROOT / "lib" / "_lint_after_edit_smoke.py"
        bad.write_text("import os\nimport sys\n")  # both unused
        try:
            code, _, stderr = run_lint(edit_payload(str(bad)))
            assert code == 0  # never blocks
            assert "lint-after-edit" in stderr, (
                f"Expected hook prefix in stderr but got: {stderr[:200]!r}"
            )
        finally:
            # Best-effort cleanup; .gitignore won't catch this so be polite.
            bad.unlink(missing_ok=True)

    def test_clean_py_file_silent(self):
        # hooks/_stdin.py is clean; should produce no output.
        code, _, stderr = run_lint(edit_payload(str(HOOKS_DIR / "_stdin.py")))
        assert code == 0
        assert stderr == ""


class TestBranchCoverage:
    """Targets specific branches that round-82 coverage scout flagged as
    uncovered: relative-path normalization, SKIP_PREFIXES hits with files
    that actually exist on disk, and unsupported-extension inside the repo."""

    def test_relative_path_normalized_against_repo_root(self):
        # When tool_input.file_path is relative (no leading slash), the hook
        # should resolve it against REPO_ROOT — line 74. Using hooks/_stdin.py
        # which is clean → expect silent success.
        code, _, stderr = run_lint(edit_payload("hooks/_stdin.py"))
        assert code == 0
        assert stderr == ""

    def test_skip_prefix_with_existing_file(self, tmp_path):
        # The existing TestSkipPrefixes uses paths that don't exist on disk,
        # so the hook bails at line 78 (`if not path.exists()`) before ever
        # reaching the SKIP_PREFIXES loop. This test creates a real .py file
        # under a SKIP_PREFIXES dir to actually exercise line 91.
        skip_dir = REPO_ROOT / "data" / "outputs"
        skip_dir.mkdir(parents=True, exist_ok=True)
        skipped_file = skip_dir / "_lint_after_edit_skip_probe.py"
        skipped_file.write_text("import os\n")  # would be a lint issue if checked
        try:
            code, _, stderr = run_lint(edit_payload(str(skipped_file)))
            assert code == 0
            # Critical: stderr must be empty. If lint actually ran on this
            # file, ruff would flag the unused `import os` and surface it.
            assert stderr == "", (
                f"SKIP_PREFIXES failed — file under data/outputs/ was linted: {stderr!r}"
            )
        finally:
            skipped_file.unlink(missing_ok=True)

    def test_unsupported_extension_inside_repo_silent(self):
        # An .md or .txt file inside the repo (so it passes the relative_to
        # check) should hit line 96's "no linter for this extension" return.
        # Existing test_non_py_non_js_exits_zero uses tmp_path which is
        # outside the repo, so it bails at the relative_to ValueError (line
        # 85) before reaching the LINTER_MAP lookup.
        probe = REPO_ROOT / "lib" / "_lint_after_edit_ext_probe.txt"
        probe.write_text("not a lintable file\n")
        try:
            code, _, stderr = run_lint(edit_payload(str(probe)))
            assert code == 0
            assert stderr == ""
        finally:
            probe.unlink(missing_ok=True)
