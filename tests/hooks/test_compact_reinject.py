"""Tests for hooks/compact-reinject.py

Verifies the hook always emits valid JSON with the correct structure
and that the injected context contains the critical policy keywords.
"""
import json
import pytest
from tests.conftest import run_hook

HOOK = "compact-reinject.py"


class TestOutputStructure:
    def test_exits_zero(self):
        code, _, _ = run_hook(HOOK, "{}")
        assert code == 0

    def test_stdout_is_valid_json(self):
        _, stdout, _ = run_hook(HOOK, "{}")
        data = json.loads(stdout)
        assert isinstance(data, dict)

    def test_hook_specific_output_present(self):
        _, stdout, _ = run_hook(HOOK, "{}")
        assert "hookSpecificOutput" in json.loads(stdout)

    def test_hook_event_name_is_precompact(self):
        _, stdout, _ = run_hook(HOOK, "{}")
        hso = json.loads(stdout)["hookSpecificOutput"]
        assert hso["hookEventName"] == "PreCompact"

    def test_additional_context_present(self):
        _, stdout, _ = run_hook(HOOK, "{}")
        hso = json.loads(stdout)["hookSpecificOutput"]
        assert "additionalContext" in hso
        assert len(hso["additionalContext"]) > 100

    def test_no_stderr(self):
        _, _, stderr = run_hook(HOOK, "{}")
        assert stderr == ""


class TestContextContent:
    """The injected context must preserve the three critical rules."""

    def get_context(self):
        _, stdout, _ = run_hook(HOOK, "{}")
        return json.loads(stdout)["hookSpecificOutput"]["additionalContext"]

    def test_draft_before_create_rule_present(self):
        ctx = self.get_context()
        assert "draft" in ctx.lower()

    def test_accuracy_rule_present(self):
        ctx = self.get_context()
        assert "hallucination" in ctx.lower() or "tool call" in ctx.lower() or "number" in ctx.lower()

    def test_mountain_time_rule_present(self):
        ctx = self.get_context()
        assert "mountain" in ctx.lower() or "denver" in ctx.lower()

    def test_intercom_constraint_present(self):
        ctx = self.get_context()
        assert "intercom" in ctx.lower()

    def test_column_width_constraint_present(self):
        ctx = self.get_context()
        assert "9360" in ctx

    def test_context_starts_with_header(self):
        ctx = self.get_context()
        assert "===" in ctx or "CRITICAL" in ctx.upper() or "RULES" in ctx.upper()
