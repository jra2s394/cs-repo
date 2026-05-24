"""Tests for hooks/draft-before-create.py

The hook always outputs a JSON "ask" permission decision.
Verifies: valid JSON output, correct hookEventName, correct permissionDecision,
and that the reason string contains the policy language.
"""
import json
import pytest
from tests.conftest import run_hook

HOOK = "draft-before-create.py"


def run(stdin="{}"):
    return run_hook(HOOK, stdin)


class TestOutputStructure:
    def test_exits_zero(self):
        code, _, _ = run()
        assert code == 0

    def test_stdout_is_valid_json(self):
        _, stdout, _ = run()
        data = json.loads(stdout)
        assert isinstance(data, dict)

    def test_hook_specific_output_present(self):
        _, stdout, _ = run()
        data = json.loads(stdout)
        assert "hookSpecificOutput" in data

    def test_hook_event_name(self):
        _, stdout, _ = run()
        hso = json.loads(stdout)["hookSpecificOutput"]
        assert hso["hookEventName"] == "PreToolUse"

    def test_permission_decision_is_ask(self):
        _, stdout, _ = run()
        hso = json.loads(stdout)["hookSpecificOutput"]
        assert hso["permissionDecision"] == "ask"

    def test_reason_contains_policy_language(self):
        _, stdout, _ = run()
        hso = json.loads(stdout)["hookSpecificOutput"]
        reason = hso["permissionDecisionReason"].lower()
        assert "draft" in reason
        assert "approve" in reason

    def test_no_stderr(self):
        _, _, stderr = run()
        assert stderr == ""


class TestInputVariants:
    """The hook fires on any matched tool call — input content doesn't matter."""

    def test_with_slack_tool_input(self):
        code, stdout, _ = run_hook(
            HOOK,
            {"tool_name": "mcp__claude_ai_Slack__slack_send_message",
             "tool_input": {"channel": "C123", "text": "hello"}},
        )
        assert code == 0
        data = json.loads(stdout)
        assert data["hookSpecificOutput"]["permissionDecision"] == "ask"

    def test_with_asana_tool_input(self):
        code, stdout, _ = run_hook(
            HOOK,
            {"tool_name": "mcp__claude_ai_Asana__create_tasks",
             "tool_input": {"name": "task"}},
        )
        assert code == 0
        assert json.loads(stdout)["hookSpecificOutput"]["permissionDecision"] == "ask"

    def test_with_empty_input(self):
        code, stdout, _ = run_hook(HOOK, {})
        assert code == 0
        assert json.loads(stdout)["hookSpecificOutput"]["permissionDecision"] == "ask"

    def test_with_invalid_json(self):
        code, stdout, _ = run_hook(HOOK, "not json")
        assert code == 0
        assert json.loads(stdout)["hookSpecificOutput"]["permissionDecision"] == "ask"
