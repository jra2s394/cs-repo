"""Tests for hooks/push-guard.py

Every regex in the hook is exercised with:
  - a canonical blocked command
  - at least one boundary / false-positive case

Exit code 2 = blocked, 0 = allowed.
"""
import pytest
from tests.conftest import run_hook, bash_input

HOOK = "push-guard.py"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def allows(command: str) -> bool:
    code, _, _ = run_hook(HOOK, bash_input(command))
    return code == 0


def blocks(command: str) -> bool:
    code, _, stderr = run_hook(HOOK, bash_input(command))
    return code == 2


# ---------------------------------------------------------------------------
# git push --force
# ---------------------------------------------------------------------------

class TestForcePush:
    def test_force_long_flag(self):
        assert blocks("git push origin feature --force")

    def test_force_long_flag_before_remote(self):
        assert blocks("git push --force origin feature")

    def test_force_short_flag(self):
        assert blocks("git push -f origin feature")

    def test_force_short_flag_combined(self):
        assert blocks("git push -f")

    def test_normal_push_not_blocked(self):
        assert allows("git push origin feature/my-feature")

    def test_push_upstream_not_blocked(self):
        assert allows("git push -u origin fix/bug-123")


# ---------------------------------------------------------------------------
# git push to protected branches
# ---------------------------------------------------------------------------

class TestProtectedBranchPush:
    def test_push_main_with_origin(self):
        assert blocks("git push origin main")

    def test_push_main_without_origin(self):
        assert blocks("git push main")

    def test_push_master_with_origin(self):
        assert blocks("git push origin master")

    def test_push_master_without_origin(self):
        assert blocks("git push master")

    # Regression: branch names that *contain* "main" or "master" must NOT be blocked
    def test_push_mainstream_not_blocked(self):
        assert allows("git push origin mainstream")

    def test_push_main_feature_not_blocked(self):
        assert allows("git push origin main-feature")

    def test_push_master_class_not_blocked(self):
        assert allows("git push origin master-class")

    def test_push_feature_branch_not_blocked(self):
        assert allows("git push origin feature/redesign")

    def test_push_chore_branch_not_blocked(self):
        assert allows("git push origin chore/update-deps")


# ---------------------------------------------------------------------------
# gh pr merge
# ---------------------------------------------------------------------------

class TestGhPrMerge:
    def test_gh_pr_merge_basic(self):
        assert blocks("gh pr merge 7 --squash")

    def test_gh_pr_merge_no_args(self):
        assert blocks("gh pr merge")

    def test_gh_pr_view_not_blocked(self):
        assert allows("gh pr view 7")

    def test_gh_pr_list_not_blocked(self):
        assert allows("gh pr list")

    def test_gh_pr_create_not_blocked(self):
        assert allows("gh pr create --title x --body y")


# ---------------------------------------------------------------------------
# gh repo visibility
# ---------------------------------------------------------------------------

class TestGhRepoVisibility:
    def test_visibility_public_blocked(self):
        assert blocks("gh repo edit --visibility public")

    def test_visibility_private_not_blocked(self):
        assert allows("gh repo edit --visibility private")

    def test_repo_view_not_blocked(self):
        assert allows("gh repo view")


# ---------------------------------------------------------------------------
# .env redirect (> .env, | tee .env)
# ---------------------------------------------------------------------------

class TestEnvRedirect:
    # Bare .env
    def test_redirect_bare_env(self):
        assert blocks("echo SECRET=x > .env")

    def test_pipe_tee_bare_env(self):
        assert blocks("cat secrets.txt | tee .env")

    # Directory-prefixed .env
    def test_redirect_prefixed_env(self):
        assert blocks("echo SECRET=x > config/.env")

    def test_redirect_nested_env(self):
        assert blocks("echo SECRET=x > src/config/.env")

    def test_pipe_tee_prefixed_env(self):
        assert blocks("cat secrets.txt | tee config/.env")

    # cp / mv to .env
    def test_cp_to_bare_env(self):
        assert blocks("cp secrets.txt .env")

    def test_cp_to_prefixed_env(self):
        assert blocks("cp secrets.txt config/.env")

    def test_mv_to_bare_env(self):
        assert blocks("mv temp.txt .env")

    def test_mv_to_prefixed_env(self):
        assert blocks("mv temp.txt config/.env")

    # Regression: .envrc must NOT be blocked (direnv)
    def test_envrc_redirect_not_blocked(self):
        assert allows("echo export FOO=bar > .envrc")

    def test_envrc_tee_not_blocked(self):
        assert allows("cat config.sh | tee .envrc")

    def test_envrc_cp_not_blocked(self):
        assert allows("cp template.sh .envrc")

    # Regression: safe suffixes must NOT be blocked
    def test_env_example_redirect_not_blocked(self):
        assert allows("cp .env.example .env.example")

    def test_env_sample_not_blocked(self):
        assert allows("echo VAR=x > .env.sample")

    def test_env_template_not_blocked(self):
        assert allows("echo VAR=x > .env.template")

    # Pipe with | (not just >)
    def test_pipe_to_env_blocked(self):
        assert blocks("printenv | grep SECRET > .env")


# ---------------------------------------------------------------------------
# Unrelated commands — must never be blocked
# ---------------------------------------------------------------------------

class TestUnrelatedCommands:
    def test_git_status(self):
        assert allows("git status")

    def test_git_log(self):
        assert allows("git log --oneline")

    def test_echo(self):
        assert allows("echo hello world")

    def test_ls(self):
        assert allows("ls -la")

    def test_cat_readme(self):
        assert allows("cat README.md")


# ---------------------------------------------------------------------------
# Malformed input — must never crash, always exit 0
# ---------------------------------------------------------------------------

class TestMalformedInput:
    def test_empty_string(self):
        code, _, _ = run_hook(HOOK, "")
        assert code == 0

    def test_invalid_json(self):
        code, _, _ = run_hook(HOOK, "not json at all")
        assert code == 0

    def test_missing_command_key(self):
        code, _, _ = run_hook(HOOK, {"tool_name": "Bash", "tool_input": {}})
        assert code == 0

    def test_null_tool_input(self):
        code, _, _ = run_hook(HOOK, {"tool_input": None})
        assert code == 0
