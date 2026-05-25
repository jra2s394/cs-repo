"""Tests for hooks/session-to-obsidian.py

Tests the pure helper functions by importing the module directly,
and tests the full export flow against a temp vault.
"""
import json
import os
import sys
from collections import Counter
from pathlib import Path
from datetime import datetime

import importlib.util
import pytest

HOOKS_DIR = Path(__file__).parent.parent.parent / "hooks"


def _load_sto():
    """Load session-to-obsidian.py as a module (hyphen in filename prevents normal import)."""
    spec = importlib.util.spec_from_file_location(
        "session_to_obsidian",
        str(HOOKS_DIR / "session-to-obsidian.py"),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(autouse=True)
def patch_vault_root(tmp_path, monkeypatch):
    """Point OBSIDIAN_VAULT at a temp directory for every test."""
    vault = tmp_path / "vault"
    vault.mkdir()
    monkeypatch.setenv("OBSIDIAN_VAULT", str(vault))


@pytest.fixture()
def sto(tmp_path):
    """Load session-to-obsidian with the patched OBSIDIAN_VAULT env already set."""
    return _load_sto()


# ---------------------------------------------------------------------------
# strip_system_tags
# ---------------------------------------------------------------------------

class TestStripSystemTags:
    def test_removes_system_reminder(self, sto):
        raw = "Hello <system-reminder>internal stuff</system-reminder> World"
        assert sto.strip_system_tags(raw) == "Hello  World"

    def test_removes_multiline_tag(self, sto):
        raw = "Before\n<system-reminder>\nline1\nline2\n</system-reminder>\nAfter"
        result = sto.strip_system_tags(raw)
        assert "system-reminder" not in result
        assert "After" in result

    def test_removes_command_name_tag(self, sto):
        raw = "User said: <command-name>daily</command-name> update"
        assert "<command-name>" not in sto.strip_system_tags(raw)

    def test_no_tags_unchanged(self, sto):
        raw = "Plain text with no tags"
        assert sto.strip_system_tags(raw) == "Plain text with no tags"

    def test_empty_string(self, sto):
        assert sto.strip_system_tags("") == ""


# ---------------------------------------------------------------------------
# infer_topic
# ---------------------------------------------------------------------------

class TestInferTopic:
    def test_uses_session_name_when_provided(self, sto):
        data = {"turns": [{"user": "some question", "assistant": "", "tools": []}]}
        assert sto.infer_topic(data, "My Custom Topic") == "My Custom Topic"

    def test_truncates_session_name_at_60(self, sto):
        long_name = "A" * 80
        result = sto.infer_topic({}, long_name)
        assert len(result) <= 60

    def test_uses_first_user_message(self, sto):
        data = {"turns": [
            {"user": "How do I fix the chart bug?", "assistant": "", "tools": []},
        ]}
        assert "How do I fix the chart bug" in sto.infer_topic(data)

    def test_truncates_long_user_message(self, sto):
        data = {"turns": [
            {"user": "A" * 200, "assistant": "", "tools": []},
        ]}
        result = sto.infer_topic(data)
        assert len(result) <= 60

    def test_falls_back_to_untitled_when_no_turns(self, sto):
        assert sto.infer_topic({"turns": []}) == "Untitled Session"

    def test_strips_markdown_symbols(self, sto):
        data = {"turns": [
            {"user": "# Fix `bug` in **push-guard**", "assistant": "", "tools": []},
        ]}
        result = sto.infer_topic(data)
        assert "#" not in result
        assert "`" not in result

    def test_strips_invalid_filename_chars(self, sto):
        data = {"turns": [
            {"user": 'Fix <the> "bug": now/later', "assistant": "", "tools": []},
        ]}
        result = sto.infer_topic(data)
        for ch in '<>":/\\|?*':
            assert ch not in result


# ---------------------------------------------------------------------------
# format_duration
# ---------------------------------------------------------------------------

class TestFormatDuration:
    def test_under_one_minute(self, sto):
        start = "2026-05-24T10:00:00Z"
        end = "2026-05-24T10:00:30Z"
        assert sto.format_duration(start, end) == "<1 min"

    def test_exact_minutes(self, sto):
        start = "2026-05-24T10:00:00Z"
        end = "2026-05-24T10:15:00Z"
        assert sto.format_duration(start, end) == "15 min"

    def test_hours_and_minutes(self, sto):
        start = "2026-05-24T10:00:00Z"
        end = "2026-05-24T11:30:00Z"
        assert sto.format_duration(start, end) == "1h 30m"

    def test_invalid_timestamps(self, sto):
        assert sto.format_duration("bad", "also bad") == "unknown"

    def test_none_values(self, sto):
        assert sto.format_duration(None, None) == "unknown"


# ---------------------------------------------------------------------------
# detect_project
# ---------------------------------------------------------------------------

class TestDetectProject:
    def test_detects_cs_repo(self, sto, tmp_path):
        data = {"cwd": str(tmp_path / "Developer" / "cs-repo")}
        assert sto.detect_project(data) == "CS Repo"

    def test_returns_none_for_unknown_cwd(self, sto, tmp_path):
        data = {"cwd": str(tmp_path / "some-other-project")}
        assert sto.detect_project(data) is None

    def test_handles_missing_cwd(self, sto):
        assert sto.detect_project({}) is None


# ---------------------------------------------------------------------------
# OBSIDIAN_PROJECT_MAP env var override
# ---------------------------------------------------------------------------

class TestProjectMapEnvOverride:
    def test_env_var_overrides_fallback(self, monkeypatch, tmp_path):
        monkeypatch.setenv("OBSIDIAN_PROJECT_MAP", '{"my-app": "My App"}')
        # Re-load the module so the env var is read at import time
        sto = _load_sto()
        assert sto.PROJECT_MAP == {"my-app": "My App"}
        assert sto.detect_project({"cwd": "/x/my-app/y"}) == "My App"

    def test_invalid_json_falls_back(self, monkeypatch):
        monkeypatch.setenv("OBSIDIAN_PROJECT_MAP", "not json {{")
        sto = _load_sto()
        assert sto.PROJECT_MAP == sto.PROJECT_MAP_FALLBACK

    def test_non_object_json_falls_back(self, monkeypatch):
        # A JSON array is valid JSON but the wrong shape
        monkeypatch.setenv("OBSIDIAN_PROJECT_MAP", '["not", "a", "dict"]')
        sto = _load_sto()
        assert sto.PROJECT_MAP == sto.PROJECT_MAP_FALLBACK

    def test_empty_env_uses_fallback(self, monkeypatch):
        monkeypatch.setenv("OBSIDIAN_PROJECT_MAP", "")
        sto = _load_sto()
        assert sto.PROJECT_MAP == sto.PROJECT_MAP_FALLBACK

    def test_unset_env_uses_fallback(self, monkeypatch):
        monkeypatch.delenv("OBSIDIAN_PROJECT_MAP", raising=False)
        sto = _load_sto()
        assert sto.PROJECT_MAP == sto.PROJECT_MAP_FALLBACK


# ---------------------------------------------------------------------------
# find_session_file — guard against missing CLAUDE_PROJECTS dir
# ---------------------------------------------------------------------------

class TestFindSessionFile:
    def test_returns_none_when_projects_dir_missing(self, sto, tmp_path, monkeypatch):
        monkeypatch.setattr(sto, "CLAUDE_PROJECTS", tmp_path / "nonexistent")
        result = sto.find_session_file("abc123")
        assert result is None

    def test_returns_none_for_unknown_session_id(self, sto, tmp_path, monkeypatch):
        projects = tmp_path / "projects"
        projects.mkdir()
        monkeypatch.setattr(sto, "CLAUDE_PROJECTS", projects)
        result = sto.find_session_file("does-not-exist")
        assert result is None

    def test_finds_session_by_id(self, sto, tmp_path, monkeypatch):
        projects = tmp_path / "projects"
        project_dir = projects / "-some-path-cs-repo"
        project_dir.mkdir(parents=True)
        session_file = project_dir / "abc12345.jsonl"
        session_file.write_text('{"type":"user"}\n')
        monkeypatch.setattr(sto, "CLAUDE_PROJECTS", projects)
        result = sto.find_session_file("abc12345")
        assert result == session_file

    def test_finds_session_at_depth_2_subdir(self, sto, tmp_path, monkeypatch):
        # Depth-2 fallback: project_dir/subdir/<id>.jsonl. Must still be found.
        projects = tmp_path / "projects"
        nested = projects / "-some-path-cs-repo" / "archive"
        nested.mkdir(parents=True)
        session_file = nested / "deep1234.jsonl"
        session_file.write_text('{"type":"user"}\n')
        monkeypatch.setattr(sto, "CLAUDE_PROJECTS", projects)
        result = sto.find_session_file("deep1234")
        assert result == session_file

    def test_does_not_recurse_past_depth_2(self, sto, tmp_path, monkeypatch):
        # Depth-3 file must NOT be returned. The previous unbounded
        # `rglob` walked every project subtree, which was O(N files) on
        # long-lived vaults. We deliberately bound to depth 2.
        projects = tmp_path / "projects"
        depth3 = projects / "-some-path-cs-repo" / "archive" / "old"
        depth3.mkdir(parents=True)
        session_file = depth3 / "deep3000.jsonl"
        session_file.write_text('{"type":"user"}\n')
        monkeypatch.setattr(sto, "CLAUDE_PROJECTS", projects)
        result = sto.find_session_file("deep3000")
        assert result is None


# ---------------------------------------------------------------------------
# parse_session
# ---------------------------------------------------------------------------

def make_jsonl(turns: list[dict]) -> str:
    lines = []
    for t in turns:
        lines.append(json.dumps(t))
    return "\n".join(lines)


class TestParseSession:
    def test_parses_basic_turn(self, sto, tmp_path):
        jsonl = tmp_path / "session.jsonl"
        jsonl.write_text(
            json.dumps({"type": "user", "message": {"content": "Hello"}, "sessionId": "abc", "cwd": "/project"}) + "\n" +
            json.dumps({"type": "assistant", "message": {"role": "assistant", "id": "m1", "content": [{"type": "text", "text": "Hi there"}]}}) + "\n"
        )
        data = sto.parse_session(jsonl)
        assert len(data["turns"]) == 1
        assert data["turns"][0]["user"] == "Hello"
        assert "Hi there" in data["turns"][0]["assistant"]

    def test_skips_tool_result_messages(self, sto, tmp_path):
        jsonl = tmp_path / "session.jsonl"
        # A user message that is a tool_result (should be skipped)
        jsonl.write_text(
            json.dumps({"type": "user", "message": {
                "content": [{"type": "tool_result", "tool_use_id": "x", "content": "result"}]
            }}) + "\n"
        )
        data = sto.parse_session(jsonl)
        assert len(data["turns"]) == 0

    def test_counts_tools_used(self, sto, tmp_path):
        jsonl = tmp_path / "session.jsonl"
        jsonl.write_text(
            json.dumps({"type": "user", "message": {"content": "do something"}, "sessionId": "abc"}) + "\n" +
            json.dumps({"type": "assistant", "message": {"role": "assistant", "id": "m1", "content": [
                {"type": "tool_use", "name": "Bash", "input": {}},
                {"type": "tool_use", "name": "Read", "input": {"file_path": "/foo.py"}},
                {"type": "tool_use", "name": "Bash", "input": {}},
            ]}}) + "\n"
        )
        data = sto.parse_session(jsonl)
        assert data["tools_used"]["Bash"] == 2
        assert data["tools_used"]["Read"] == 1

    def test_collects_files_touched(self, sto, tmp_path):
        jsonl = tmp_path / "session.jsonl"
        jsonl.write_text(
            json.dumps({"type": "user", "message": {"content": "read files"}, "sessionId": "abc"}) + "\n" +
            json.dumps({"type": "assistant", "message": {"role": "assistant", "id": "m1", "content": [
                {"type": "tool_use", "name": "Read", "input": {"file_path": "/project/foo.py"}},
                {"type": "tool_use", "name": "Edit", "input": {"file_path": "/project/bar.py"}},
            ]}}) + "\n"
        )
        data = sto.parse_session(jsonl)
        assert "/project/foo.py" in data["files_touched"]
        assert "/project/bar.py" in data["files_touched"]

    def test_empty_file_returns_no_turns(self, sto, tmp_path):
        jsonl = tmp_path / "empty.jsonl"
        jsonl.write_text("")
        data = sto.parse_session(jsonl)
        assert data["turns"] == []


# ---------------------------------------------------------------------------
# build_markdown
# ---------------------------------------------------------------------------

class TestBuildMarkdown:
    def _sample_data(self):
        return {
            "session_id": "abc12345",
            "cwd": "/tmp/cs-repo",
            "git_branch": "feature/test",
            "version": "1.0.0",
            "start_time": "2026-05-24T10:00:00Z",
            "end_time": "2026-05-24T10:30:00Z",
            "turns": [
                {"user": "Fix the bug", "assistant": "Done.", "tools": ["Edit"]},
            ],
            "tools_used": Counter({"Edit": 1}),
            "files_touched": ["/project/hook.py"],
        }

    def test_contains_yaml_frontmatter(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert md.startswith("---")
        assert "session_id: abc12345" in md

    def test_contains_conversation_section(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert "## Conversation" in md

    def test_contains_tools_used_section(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert "## Tools Used" in md
        assert "Edit" in md

    def test_contains_files_touched_section(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert "## Files Touched" in md
        assert "/project/hook.py" in md

    def test_contains_duration(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert "30 min" in md

    def test_contains_wikilink_for_cs_repo(self, sto):
        md = sto.build_markdown(self._sample_data())
        assert "[[CS Repo]]" in md
