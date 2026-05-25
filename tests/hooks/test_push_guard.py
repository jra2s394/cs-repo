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
    code, _, _ = run_hook(HOOK, bash_input(command))
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
# Refspec / global-option bypass routes for protected-branch push
# ---------------------------------------------------------------------------

class TestProtectedBranchPushBypasses:
    """Every variant of pushing to main that an attacker (or autocomplete)
    might use should be blocked, not just the literal `git push origin main`.
    """

    def test_force_prefix_main(self):
        # `+main` is shorthand for `+refs/heads/main:refs/heads/main` — silent force-push
        assert blocks("git push origin +main")

    def test_force_prefix_master(self):
        assert blocks("git push origin +master")

    def test_refs_heads_main(self):
        assert blocks("git push origin refs/heads/main")

    def test_head_refspec_to_main(self):
        assert blocks("git push origin HEAD:main")

    def test_branch_to_main_refspec(self):
        # Pushing FROM a feature branch TO main — destination is what matters
        assert blocks("git push origin feature:main")

    def test_main_to_main_refspec(self):
        assert blocks("git push origin main:main")

    def test_delete_main_via_empty_src(self):
        # `:main` deletes the remote main branch
        assert blocks("git push origin :main")

    def test_delete_main_via_delete_flag(self):
        assert blocks("git push --delete origin main")

    def test_global_option_git_c(self):
        # `git -c key=val push origin main` bypassed the original regex
        assert blocks("git -c receive.denyCurrentBranch=ignore push origin main")

    def test_global_option_no_pager(self):
        assert blocks("git --no-pager push origin main")

    def test_global_option_dash_capital_c_path(self):
        # `-C /path` runs git as if cd'd into /path
        assert blocks("git -C /tmp/repo push origin main")

    def test_env_var_prefix(self):
        assert blocks("GIT_AUTHOR_NAME=x git push origin main")


class TestProtectedBranchPushFalsePositives:
    """`main` or `master` appearing elsewhere in the refspec — without being
    the destination — must not trigger the block.
    """

    def test_pushing_from_main_to_dev_not_blocked(self):
        # Source is main, destination is dev. We block pushes TO main, not FROM.
        assert allows("git push origin main:dev")

    def test_pushing_from_master_to_release_not_blocked(self):
        assert allows("git push origin master:release-2024")

    def test_branch_path_with_main_segment_not_blocked(self):
        # Branch literally named feature/main (slash-delimited)
        assert allows("git push origin feature/main")

    def test_mainstream_branch_not_blocked(self):
        assert allows("git push origin mainstream")

    def test_main_feature_branch_via_refspec_not_blocked(self):
        assert allows("git push origin HEAD:main-feature")


# ---------------------------------------------------------------------------
# .env write bypass routes
# ---------------------------------------------------------------------------

class TestEnvWriteBypasses:
    def test_tee_dash_a_env(self):
        # `tee -a` was bypassed by the previous greedy regex
        assert blocks("cat secrets.txt | tee -a .env")

    def test_tee_dash_a_prefixed_env(self):
        assert blocks("cat secrets.txt | tee -a config/.env")

    def test_tee_multi_flag_env(self):
        assert blocks("cat x | tee -ai .env")

    def test_install_to_env(self):
        # install(1) writes a file to a destination — not previously caught
        assert blocks("install secrets.txt .env")

    def test_install_with_mode_to_env(self):
        assert blocks("install -m 600 secrets.txt .env")

    def test_dd_of_env(self):
        assert blocks("dd if=secrets.txt of=.env")

    def test_dd_of_prefixed_env(self):
        assert blocks("dd if=secrets.txt of=config/.env bs=1024")

    # Regression: tee/install/dd on .envrc or .env.example must still pass
    def test_tee_dash_a_envrc_not_blocked(self):
        assert allows("cat config.sh | tee -a .envrc")

    def test_install_to_env_example_not_blocked(self):
        assert allows("install template.env .env.example")

    def test_dd_of_envrc_not_blocked(self):
        assert allows("dd if=src of=.envrc")


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
