"""Tests for hooks/secret-scan.py

The hook reads `git diff --cached` from the working directory, so each test
materializes a temp repo, stages a file containing the secret-like string,
then invokes the hook with `cwd` pointed at the repo.

Exit code 2 = blocked, 0 = allowed.
"""
import os
import subprocess

from tests.conftest import HOOKS_DIR, _init_repo_on_branch, bash_input, run_hook, run_hook_in_dir

HOOK = "secret-scan.py"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stage(repo, filename: str, content: str) -> None:
    """Write a file inside `repo` and stage it."""
    env = {**os.environ,
           "GIT_AUTHOR_NAME": "Test", "GIT_AUTHOR_EMAIL": "t@t.com",
           "GIT_COMMITTER_NAME": "Test", "GIT_COMMITTER_EMAIL": "t@t.com"}
    (repo / filename).write_text(content)
    subprocess.run(["git", "add", filename], cwd=str(repo),
                   check=True, capture_output=True, env=env)


def _scan(repo, command: str = "git commit -m 'msg'") -> tuple[int, str]:
    code, _, stderr = run_hook_in_dir(HOOK, bash_input(command), repo)
    return code, stderr


# ---------------------------------------------------------------------------
# Provider tokens
# ---------------------------------------------------------------------------

class TestProviderTokens:
    def test_shortcut_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "config.json",
               '{"SHORTCUT_API_TOKEN": "sct_rw_test_NjVmMGNmOTQtMWYwYS00NTdkLWFlODU"}')
        code, stderr = _scan(repo)
        assert code == 2
        assert "Shortcut API token" in stderr

    def test_github_personal_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "note.md", "token: ghp_" + "A" * 36)
        code, stderr = _scan(repo)
        assert code == 2
        assert "GitHub personal token" in stderr

    def test_openai_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "secret.env", "OPENAI_API_KEY=sk-" + "A" * 40)
        code, stderr = _scan(repo)
        assert code == 2
        assert "OpenAI API key" in stderr

    def test_anthropic_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "secret.env", "ANTHROPIC_API_KEY=sk-ant-" + "A" * 40)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Anthropic API key" in stderr

    def test_slack_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "slack.env", "SLACK=xoxb-" + "1" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Slack bot token" in stderr

    def test_aws_access_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "aws.env", "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE")
        code, stderr = _scan(repo)
        assert code == 2
        assert "AWS access key" in stderr

    def test_rsa_private_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "key.pem", "-----BEGIN RSA PRIVATE KEY-----\nABC\n-----END")
        code, stderr = _scan(repo)
        assert code == 2
        assert "RSA private key" in stderr


# ---------------------------------------------------------------------------
# Non-commit invocations
# ---------------------------------------------------------------------------

class TestOnlyFiresOnCommit:
    def test_git_log_passes_even_with_secret_staged(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "leak.env", "ghp_" + "A" * 36)
        code, _ = _scan(repo, command="git log --oneline")
        assert code == 0

    def test_git_status_passes(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "leak.env", "ghp_" + "A" * 36)
        code, _ = _scan(repo, command="git status")
        assert code == 0

    def test_unrelated_bash_passes(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "leak.env", "ghp_" + "A" * 36)
        code, _ = _scan(repo, command="ls -la")
        assert code == 0


# ---------------------------------------------------------------------------
# Clean commits
# ---------------------------------------------------------------------------

class TestCleanCommit:
    def test_no_secret_passes(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "notes.md", "# Just a note\n\nNothing sensitive here.")
        code, _ = _scan(repo)
        assert code == 0

    def test_short_string_with_sk_prefix_not_blocked(self, tmp_path):
        # 'sk-' alone is too short to count — pattern requires 32+ chars after.
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "notes.md", "field name: sk-foo")
        code, _ = _scan(repo)
        assert code == 0


# ---------------------------------------------------------------------------
# Allowlist
# ---------------------------------------------------------------------------

class TestAllowlist:
    def test_hook_file_itself_skipped(self, tmp_path):
        """Editing the hook (which contains example patterns) must not block."""
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        (repo / "hooks").mkdir()
        _stage(repo, "hooks/secret-scan.py",
               'PATTERN = "sct_rw_test_NjVmMGNmOTQtMWYwYS00NTdkLWFlODU"')
        code, _ = _scan(repo)
        assert code == 0

    def test_test_file_itself_skipped(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        (repo / "tests" / "hooks").mkdir(parents=True)
        _stage(repo, "tests/hooks/test_secret_scan.py",
               'TOKEN = "sct_rw_test_NjVmMGNmOTQtMWYwYS00NTdkLWFlODU"')
        code, _ = _scan(repo)
        assert code == 0


# ---------------------------------------------------------------------------
# Robustness
# ---------------------------------------------------------------------------

class TestRobustness:
    def test_invalid_json_returns_zero(self):
        code, _, _ = run_hook(HOOK, "not valid json")
        assert code == 0

    def test_missing_tool_input_returns_zero(self):
        code, _, _ = run_hook(HOOK, {"tool_name": "Bash"})
        assert code == 0

    def test_outside_git_repo_returns_zero(self, tmp_path):
        # No `git init` — git diff will fail; hook should not crash.
        code, _ = _scan(tmp_path)
        assert code == 0
