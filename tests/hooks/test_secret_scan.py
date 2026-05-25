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
        assert "Slack token" in stderr

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
# Modern provider tokens (added in scrub-and-harden)
# ---------------------------------------------------------------------------

class TestModernProviderTokens:
    def test_openai_project_key_blocked(self, tmp_path):
        # sk-proj keys use _ and -, which the legacy [A-Za-z0-9] regex misses.
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "secret.env", "OPENAI_API_KEY=sk-proj-" + "A_B-" * 12 + "ABCD")
        code, stderr = _scan(repo)
        assert code == 2
        assert "OpenAI project key" in stderr

    def test_stripe_live_secret_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "stripe.env", "STRIPE_KEY=sk_live_" + "A" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Stripe live secret key" in stderr

    def test_stripe_live_publishable_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "stripe.env", "PUB=pk_live_" + "A" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Stripe live publishable" in stderr

    def test_stripe_test_key_warns_does_not_block(self, tmp_path):
        # Test keys are flagged but allowed through. Exit 0 with warning text.
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "stripe.env", "STRIPE_TEST=sk_test_" + "A" * 30)
        code, stderr = _scan(repo)
        assert code == 0
        assert "Stripe test secret key" in stderr
        assert "WARNING" in stderr

    def test_twilio_account_sid_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "twilio.env", "TWILIO_ACCOUNT_SID=AC" + "a1" * 16)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Twilio account SID" in stderr

    def test_gcp_service_account_key_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "sa.json",
               '{"type":"service_account","private_key": "-----BEGIN PRIVATE KEY-----\\nMIIE..."}')
        code, stderr = _scan(repo)
        assert code == 2
        assert "GCP service account key" in stderr

    def test_slack_workspace_token_blocked(self, tmp_path):
        # xoxa- (workspace) wasn't covered by the original [baprs] character class.
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "slack.env", "SLACK=xoxa-" + "1" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Slack token" in stderr

    def test_slack_config_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "slack.env", "SLACK=xoxc-" + "1" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Slack token" in stderr

    def test_slack_refresh_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "slack.env", "SLACK=xoxe-" + "1" * 30)
        code, stderr = _scan(repo)
        assert code == 2
        assert "Slack token" in stderr

    def test_github_user_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "gh.env", "GH=ghu_" + "A" * 36)
        code, stderr = _scan(repo)
        assert code == 2
        assert "GitHub user token" in stderr

    def test_github_refresh_token_blocked(self, tmp_path):
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "gh.env", "GH=ghr_" + "A" * 36)
        code, stderr = _scan(repo)
        assert code == 2
        assert "GitHub refresh token" in stderr

    def test_aws_secret_access_key_blocked(self, tmp_path):
        # Heuristic relies on the surrounding name. The 40-char base64 string
        # alone is too generic — the assignment context disambiguates.
        repo = _init_repo_on_branch(tmp_path, "feature/x")
        _stage(repo, "aws.env",
               "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY")
        code, stderr = _scan(repo)
        assert code == 2
        assert "AWS secret access key" in stderr


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
