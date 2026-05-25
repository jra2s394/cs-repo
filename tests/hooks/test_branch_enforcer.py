"""Tests for hooks/branch-enforcer.py

Uses real temp git repos to test actual branch detection.
Exit code 2 = blocked, 0 = allowed.
"""
import pytest
from tests.conftest import run_hook_in_dir, bash_input

HOOK = "branch-enforcer.py"


class TestBlockedOnProtectedBranches:
    def test_commit_on_main_blocked(self, main_branch_repo):
        code, _, stderr = run_hook_in_dir(
            HOOK, bash_input('git commit -m "fix: something"'), main_branch_repo
        )
        assert code == 2
        assert "main" in stderr.lower()

    def test_commit_on_master_blocked(self, master_branch_repo):
        code, _, stderr = run_hook_in_dir(
            HOOK, bash_input('git commit -m "fix: something"'), master_branch_repo
        )
        assert code == 2
        assert "master" in stderr.lower()

    def test_blocked_message_mentions_feature_branch(self, main_branch_repo):
        _, _, stderr = run_hook_in_dir(
            HOOK, bash_input('git commit -m "fix"'), main_branch_repo
        )
        assert "feature branch" in stderr.lower() or "checkout" in stderr.lower()


class TestAllowedOnFeatureBranches:
    def test_commit_on_feature_branch_allowed(self, feature_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git commit -m "fix: my change"'), feature_branch_repo
        )
        assert code == 0

    def test_commit_on_docs_branch_allowed(self, tmp_path):
        from tests.conftest import _init_repo_on_branch
        repo = _init_repo_on_branch(tmp_path, "docs/update-readme")
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git commit -m "docs: update"'), repo
        )
        assert code == 0

    def test_commit_on_chore_branch_allowed(self, tmp_path):
        from tests.conftest import _init_repo_on_branch
        repo = _init_repo_on_branch(tmp_path, "chore/cleanup")
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git commit -m "chore: cleanup"'), repo
        )
        assert code == 0


class TestNonCommitCommandsPassThrough:
    def test_git_status_not_intercepted(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input("git status"), main_branch_repo
        )
        assert code == 0

    def test_git_log_not_intercepted(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input("git log --oneline"), main_branch_repo
        )
        assert code == 0

    def test_git_push_not_intercepted(self, main_branch_repo):
        # push is handled by push-guard, not branch-enforcer
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input("git push origin main"), main_branch_repo
        )
        assert code == 0

    def test_ls_not_intercepted(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input("ls -la"), main_branch_repo
        )
        assert code == 0


class TestGitCommitBypasses:
    """Commits invoked with git's global options (`-c`, `--no-pager`, `-C`,
    env-var prefixes) must still be intercepted when on a protected branch.
    The naive `"git commit" in command` substring check missed these.
    """

    def test_dash_c_key_val_blocked_on_main(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git -c commit.gpgsign=false commit -m "x"'),
            main_branch_repo,
        )
        assert code == 2

    def test_no_pager_blocked_on_main(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git --no-pager commit -m "x"'),
            main_branch_repo,
        )
        assert code == 2

    def test_dash_capital_c_path_blocked_on_main(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input(f'git -C {main_branch_repo} commit -m "x"'),
            main_branch_repo,
        )
        assert code == 2

    def test_env_var_prefix_blocked_on_main(self, main_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('GIT_AUTHOR_NAME=x git commit -m "x"'),
            main_branch_repo,
        )
        assert code == 2

    def test_dash_c_on_feature_branch_allowed(self, feature_branch_repo):
        code, _, _ = run_hook_in_dir(
            HOOK, bash_input('git -c commit.gpgsign=false commit -m "x"'),
            feature_branch_repo,
        )
        assert code == 0


class TestMalformedInput:
    def test_empty_string(self, tmp_path):
        code, _, _ = run_hook_in_dir(HOOK, "", tmp_path)
        assert code == 0

    def test_invalid_json(self, tmp_path):
        code, _, _ = run_hook_in_dir(HOOK, "not json", tmp_path)
        assert code == 0

    def test_missing_command_key(self, tmp_path):
        code, _, _ = run_hook_in_dir(HOOK, {"tool_input": {}}, tmp_path)
        assert code == 0
