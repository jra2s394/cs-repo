"""Tests for hooks/file-protector.py

Covers every blocked suffix, every blocked filename, .git/ internals,
and critically the false-positive cases that have burned us before
(.envrc, .env.example, etc.).

Exit code 2 = blocked, 0 = allowed.
"""
import pytest
from tests.conftest import run_hook, edit_input

HOOK = "file-protector.py"


def allows(path: str) -> bool:
    code, _, _ = run_hook(HOOK, edit_input(path))
    return code == 0


def blocks(path: str) -> bool:
    code, _, _ = run_hook(HOOK, edit_input(path))
    return code == 2


# ---------------------------------------------------------------------------
# .env files
# ---------------------------------------------------------------------------

class TestEnvFiles:
    def test_bare_env(self):
        assert blocks("/project/.env")

    def test_env_in_subdir(self):
        assert blocks("/project/config/.env")

    def test_env_production(self):
        assert blocks("/project/.env.production")

    def test_env_local(self):
        assert blocks("/project/.env.local")

    def test_env_staging(self):
        assert blocks("/project/.env.staging")

    def test_env_test(self):
        assert blocks("/project/.env.test")

    # Regression: .envrc must NOT be blocked
    def test_envrc_not_blocked(self):
        assert allows("/project/.envrc")

    def test_envrc_in_subdir_not_blocked(self):
        assert allows("/project/subdir/.envrc")

    # Regression: safe template suffixes must NOT be blocked
    def test_env_example_not_blocked(self):
        assert allows("/project/.env.example")

    def test_env_sample_not_blocked(self):
        assert allows("/project/.env.sample")

    def test_env_template_not_blocked(self):
        assert allows("/project/.env.template")


# ---------------------------------------------------------------------------
# Private key and certificate file extensions
# ---------------------------------------------------------------------------

class TestPrivateKeyFiles:
    def test_pem_file(self):
        assert blocks("/home/user/.ssh/server.pem")

    def test_key_file(self):
        assert blocks("/project/certs/private.key")

    def test_p12_file(self):
        assert blocks("/project/keystore.p12")

    def test_pfx_file(self):
        assert blocks("/project/cert.pfx")

    def test_pem_in_root(self):
        assert blocks("/project/ca.pem")

    def test_key_deeply_nested(self):
        assert blocks("/a/b/c/d/service.key")

    # Files that merely contain "key" in their name are allowed
    def test_apikey_config_not_blocked(self):
        assert allows("/project/apikey-config.json")

    def test_keyboard_shortcuts_not_blocked(self):
        assert allows("/project/keyboard-shortcuts.md")


# ---------------------------------------------------------------------------
# Named credential files
# ---------------------------------------------------------------------------

class TestNamedCredentialFiles:
    def test_id_rsa(self):
        assert blocks("/home/user/.ssh/id_rsa")

    def test_id_ed25519(self):
        assert blocks("/home/user/.ssh/id_ed25519")

    def test_id_ecdsa(self):
        assert blocks("/home/user/.ssh/id_ecdsa")

    def test_credentials_json(self):
        assert blocks("/project/credentials.json")

    def test_service_account_json(self):
        assert blocks("/project/service-account.json")

    def test_mcp_json(self):
        assert blocks("/project/.mcp.json")

    # Files with similar names but NOT in the exact blocklist are allowed
    def test_my_credentials_txt_not_blocked(self):
        assert allows("/project/my-credentials.txt")

    def test_gcp_service_account_not_blocked(self):
        # Only exact basename match "service-account.json" is blocked
        assert allows("/project/gcp-service-account-backup.json")

    def test_mcp_config_not_blocked(self):
        assert allows("/project/mcp-config.json")


# ---------------------------------------------------------------------------
# .git/ internals
# ---------------------------------------------------------------------------

class TestGitInternals:
    def test_git_config(self):
        assert blocks("/project/.git/config")

    def test_git_hooks_file(self):
        assert blocks("/project/.git/hooks/pre-commit")

    def test_git_objects(self):
        assert blocks("/project/.git/objects/ab/cdef1234")

    def test_git_head(self):
        assert blocks("/project/.git/HEAD")

    # .github/ is NOT the same as .git/ — must be allowed
    def test_github_pr_template_not_blocked(self):
        assert allows("/project/.github/pull_request_template.md")

    def test_github_workflows_not_blocked(self):
        assert allows("/project/.github/workflows/test.yml")


# ---------------------------------------------------------------------------
# Normal project files — must always be allowed
# ---------------------------------------------------------------------------

class TestAllowedFiles:
    def test_readme(self):
        assert allows("/project/README.md")

    def test_python_source(self):
        assert allows("/project/hooks/push-guard.py")

    def test_javascript_source(self):
        assert allows("/project/lib/report-theme.js")

    def test_json_config(self):
        assert allows("/project/config.json")

    def test_package_json(self):
        assert allows("/project/package.json")

    def test_settings_json(self):
        # .claude/settings.json is NOT in the file-protector blocklist
        # (it's blocked by the self-modification hard block in Claude Code itself)
        assert allows("/project/.claude/settings.json")

    def test_empty_path(self):
        assert allows("")


# ---------------------------------------------------------------------------
# Malformed input — must never crash
# ---------------------------------------------------------------------------

class TestMalformedInput:
    def test_empty_string(self):
        code, _, _ = run_hook(HOOK, "")
        assert code == 0

    def test_invalid_json(self):
        code, _, _ = run_hook(HOOK, "not json")
        assert code == 0

    def test_missing_file_path_key(self):
        code, _, _ = run_hook(HOOK, {"tool_name": "Edit", "tool_input": {}})
        assert code == 0

    def test_null_tool_input(self):
        code, _, _ = run_hook(HOOK, {"tool_input": None})
        assert code == 0
