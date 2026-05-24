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
import re
import subprocess
import sys

# (label, regex). Patterns favor specificity over recall — false positives
# are noisy enough to train people to ignore the hook.
SECRET_PATTERNS = [
    ("Shortcut API token",     re.compile(r"sct_[a-z]{2}_[A-Za-z0-9_\-]{20,}")),
    ("GitHub personal token",  re.compile(r"\bghp_[A-Za-z0-9]{30,}\b")),
    ("GitHub OAuth token",     re.compile(r"\bgho_[A-Za-z0-9]{30,}\b")),
    ("GitHub app token",       re.compile(r"\bghs_[A-Za-z0-9]{30,}\b")),
    ("OpenAI API key",         re.compile(r"\bsk-[A-Za-z0-9]{32,}\b")),
    ("Anthropic API key",      re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{20,}\b")),
    ("Slack bot token",        re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{20,}\b")),
    ("AWS access key",         re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Google API key",         re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("RSA private key",        re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----")),
    ("JWT",                    re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b")),
]

# Diff lines under these paths are skipped (placeholder examples, test fixtures
# that intentionally include token-looking strings, this file itself).
ALLOW_PATHS = (
    "hooks/secret-scan.py",
    "tests/hooks/test_secret_scan.py",
)


def is_git_commit(command: str) -> bool:
    """True when the Bash invocation is a `git commit` (not `log`, `status`, etc.)."""
    # Strip leading env vars / `cd && ` segments; look for `git commit` as a whole word.
    return re.search(r"(?:^|\s|&&|;|\|)\s*git\s+commit\b", command) is not None


def staged_diff() -> str:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--no-color", "-U0"],
            capture_output=True, text=True, timeout=10,
        )
    except (subprocess.SubprocessError, OSError):
        return ""
    return result.stdout or ""


def scan(diff_text: str):
    """Yield (label, snippet, path) for each secret found in added lines."""
    current_path = None
    for line in diff_text.splitlines():
        # Track the file the hunk applies to.
        if line.startswith("+++ b/"):
            current_path = line[6:]
            continue
        # Only inspect added lines; skip the +++ header above.
        if not line.startswith("+") or line.startswith("+++"):
            continue
        if current_path and any(current_path.startswith(p) for p in ALLOW_PATHS):
            continue
        added = line[1:]
        for label, pattern in SECRET_PATTERNS:
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

    findings = list(scan(diff))
    if not findings:
        return 0

    print("BLOCKED: staged changes look like they contain a secret.", file=sys.stderr)
    for label, snippet, path in findings:
        print(f"  - {label}: {snippet}  ({path})", file=sys.stderr)
    print(
        "\nRemove the secret, rotate it if it has ever been committed, and try again.\n"
        "If this is a false positive, add the path to ALLOW_PATHS in hooks/secret-scan.py.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
