#!/usr/bin/env python3
"""Block `git commit` when staged content looks like it contains a secret.

Scans `git diff --cached` for high-confidence secret patterns (provider API
tokens, private keys, JWTs) and blocks the commit before it lands. Designed
to catch the obvious cases — not a substitute for a real secret scanner.

Exits:
  0  no secrets detected (or not a `git commit` invocation)
  2  match found — commit blocked, message printed to stderr

Customize:
  - Add patterns to `SECRET_PATTERNS` for additional providers.
  - Add filenames to `ALLOW_PATHS` to skip files known to contain placeholder
    examples (e.g. docs that intentionally show token formats).
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _git import is_git_commit as _shared_is_git_commit  # noqa: E402

# (label, regex). Patterns favor specificity over recall — false positives
# are noisy enough to train people to ignore the hook.
#
# IMPORTANT: list more-specific patterns BEFORE more-general ones. The OpenAI
# project key (sk-proj-...) must come before the legacy "sk-..." pattern so
# the legacy regex doesn't greedily swallow the prefix and mislabel it.
SECRET_PATTERNS = [
    ("Shortcut API token",        re.compile(r"sct_[a-z]{2}_[A-Za-z0-9_\-]{20,}")),
    ("GitHub personal token",     re.compile(r"\bghp_[A-Za-z0-9]{30,}\b")),
    ("GitHub OAuth token",        re.compile(r"\bgho_[A-Za-z0-9]{30,}\b")),
    ("GitHub app token",          re.compile(r"\bghs_[A-Za-z0-9]{30,}\b")),
    ("GitHub user token",         re.compile(r"\bghu_[A-Za-z0-9]{30,}\b")),
    ("GitHub refresh token",      re.compile(r"\bghr_[A-Za-z0-9]{30,}\b")),
    ("OpenAI project key",        re.compile(r"\bsk-proj-[A-Za-z0-9_\-]{40,}\b")),
    ("OpenAI API key",            re.compile(r"\bsk-[A-Za-z0-9]{32,}\b")),
    ("Anthropic API key",         re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}\b")),
    ("Stripe live secret key",    re.compile(r"\bsk_live_[A-Za-z0-9]{24,}\b")),
    ("Stripe live publishable",   re.compile(r"\bpk_live_[A-Za-z0-9]{24,}\b")),
    ("Twilio account SID",        re.compile(r"\bAC[0-9a-f]{32}\b")),
    ("GCP service account key",   re.compile(r'"private_key"\s*:\s*"-----BEGIN')),
    # Slack: bot (b), user (p), workspace (a), config (c), config-refresh (d),
    # refresh (e), oauth (r), session (s). Pattern stays restrictive on what
    # follows the prefix.
    ("Slack token",               re.compile(r"\bxox[abcdepsr]-[A-Za-z0-9\-]{20,}\b")),
    ("AWS access key",            re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    # Heuristic: only flag a 40-char base64-ish string when the surrounding
    # text actually names it as an AWS secret. Bare 40-char strings produce
    # too many false positives.
    ("AWS secret access key",     re.compile(r"aws[_-]?secret[_-]?(?:access[_-]?)?key[\"'\s:=]+([A-Za-z0-9/+]{40})\b", re.IGNORECASE)),
    ("Google API key",            re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("RSA private key",           re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----")),
    ("JWT",                       re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b")),
]

# Patterns that print a warning but do NOT block the commit. Used for test-mode
# keys: their leak is lower-severity but still worth flagging since they often
# co-locate with the live key in deployment configs.
WARN_PATTERNS = [
    ("Stripe test secret key",    re.compile(r"\bsk_test_[A-Za-z0-9]{24,}\b")),
    ("Stripe test publishable",   re.compile(r"\bpk_test_[A-Za-z0-9]{24,}\b")),
]

# Files whose added lines are skipped during scanning. Lists exact paths
# (not prefixes) — these files intentionally include token-looking strings
# (the patterns themselves, and tests that exercise them).
#
# Match is exact-equality only — see scan(). A prior version used
# `startswith()` which would also have allowed `hooks/secret-scan.py.bak`,
# `tests/hooks/test_secret_scan.py.disabled`, etc. — silently bypassing
# the scanner on any sibling that happened to share the prefix.
#
# If you need to allow a whole directory in the future, extend the
# membership check in scan() to also match `current_path.startswith(p + "/")`.
ALLOW_PATHS = (
    "hooks/secret-scan.py",
    "tests/hooks/test_secret_scan.py",
)


def is_git_commit(command: str) -> bool:
    """True when the Bash invocation is a `git commit` (not `log`, `status`, etc.).

    Delegates to the shared helper so secret-scan, branch-enforcer, and
    block-attribution agree on detection — including `git -c key=val commit`,
    `git --no-pager commit`, and env-var-prefixed forms.
    """
    return _shared_is_git_commit(command)


def staged_diff() -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--no-color", "-U0"],
            capture_output=True, text=True, timeout=10,
        )
    except (subprocess.SubprocessError, OSError):
        return ""
    return result.stdout or ""


def scan(diff_text: str, patterns):
    """Yield (label, snippet, path) for each pattern hit in added lines."""
    current_path = None
    for line in diff_text.splitlines():
        # Track the file the hunk applies to.
        if line.startswith("+++ b/"):
            current_path = line[6:]
            continue
        # Only inspect added lines; skip the +++ header above.
        if not line.startswith("+") or line.startswith("+++"):
            continue
        if current_path and current_path in ALLOW_PATHS:
            continue
        added = line[1:]
        for label, pattern in patterns:
            match = pattern.search(added)
            if match:
                snippet = match.group(0)
                # Truncate so a long match doesn't dump the whole secret to stderr.
                if len(snippet) > 24:
                    snippet = snippet[:8] + "…" + snippet[-4:]
                yield label, snippet, current_path or "(unknown file)"


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0

    command = (data.get("tool_input") or {}).get("command", "")
    if not is_git_commit(command):
        return 0

    diff = staged_diff()
    if not diff:
        return 0

    block_findings = list(scan(diff, SECRET_PATTERNS))
    warn_findings = list(scan(diff, WARN_PATTERNS))

    if warn_findings and not block_findings:
        print("WARNING: staged changes contain test-mode credentials.", file=sys.stderr)
        for label, snippet, path in warn_findings:
            print(f"  - {label}: {snippet}  ({path})", file=sys.stderr)
        print(
            "\nTest keys are lower-severity but still worth scrubbing — they often\n"
            "land next to live keys in the same config.",
            file=sys.stderr,
        )
        # Warning only: do not block.
        return 0

    if not block_findings:
        return 0

    print("BLOCKED: staged changes look like they contain a secret.", file=sys.stderr)
    for label, snippet, path in block_findings:
        print(f"  - {label}: {snippet}  ({path})", file=sys.stderr)
    for label, snippet, path in warn_findings:
        print(f"  - (warn) {label}: {snippet}  ({path})", file=sys.stderr)
    print(
        "\nRemove the secret, rotate it if it has ever been committed, and try again.\n"
        "If this is a false positive, add the path to ALLOW_PATHS in hooks/secret-scan.py.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
