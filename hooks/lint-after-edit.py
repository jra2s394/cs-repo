#!/usr/bin/env python3
"""Run the right linter on a file Claude just edited.

PostToolUse hook for Edit/Write tool calls. Surfaces lint findings
immediately after Claude edits a file — instead of waiting for
`make lint` or pre-commit / CI to catch them later.

  - `.py` files → `ruff check <file>` (uses ruff.toml in repo root)
  - `.js` files → `npx --no-install biome check <file>` (uses biome.json)

NON-BLOCKING. Always exits 0. The hook's job is to make lint output
visible, not to fail the edit. PreToolUse hooks (file-protector.py)
already handle the "stop bad edits" case before they happen; this is
a feedback hook, not a gate.

Skips files outside lint scope: tests/, docs/, .md, .json, generated
output dirs, anything that ruff/biome wouldn't normally check. Also
skips files that no longer exist (e.g., the edit was a delete) and
files outside the repo root.

Customize:
  - Add file extensions to LINTER_MAP for additional languages.
  - Add path prefixes to SKIP_PREFIXES to silence noise from
    directories that intentionally don't follow the same rules.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _stdin import parse_or_exit

REPO_ROOT = Path(__file__).resolve().parent.parent

# Extension → (linter binary, args producer). The args producer takes a
# Path and returns the argv list. Using a function lets each linter
# format args its own way without if/elif sprawl in the main loop.
# Each value is the argv list for that extension. We use module-mode for
# ruff (matches what `make lint-py` runs) and npx for biome (matches
# what `make lint-js` runs) — that way the hook works whether or not
# the binaries are on PATH directly, as long as the project dev deps
# are installed.
LINTER_MAP = {
    ".py": lambda p: [sys.executable, "-m", "ruff", "check", str(p)],
    ".js": lambda p: ["npx", "--no-install", "biome", "check", str(p)],
}

# Don't lint paths under these (relative to repo root). They're either
# generated, not linter-scoped, or follow different rules.
SKIP_PREFIXES = (
    "node_modules/",
    ".venv/",
    "venv/",
    "__pycache__/",
    ".pytest_cache/",
    ".ruff_cache/",
    ".mypy_cache/",
    "coverage/",
    "out/",
    "data/outputs/",
)


def main() -> int:
    data = parse_or_exit()
    file_path_str = (data.get("tool_input") or {}).get("file_path", "")
    if not file_path_str:
        return 0

    path = Path(file_path_str)
    if not path.is_absolute():
        path = REPO_ROOT / path

    # Skip non-existent (the edit may have been a delete or the path
    # was wrong somehow; either way nothing to lint).
    if not path.exists() or not path.is_file():
        return 0

    # Skip files outside the repo.
    try:
        rel = path.resolve().relative_to(REPO_ROOT)
    except ValueError:
        return 0
    rel_str = str(rel)

    # Skip generated/cache/output paths.
    for prefix in SKIP_PREFIXES:
        if rel_str.startswith(prefix):
            return 0

    # Find the right linter for this extension.
    arg_builder = LINTER_MAP.get(path.suffix)
    if arg_builder is None:
        return 0

    # Skip if the linter isn't installed in the environment — better
    # silent than spamming "module not found" on every edit. For
    # python -m <module> form, check whether the module is importable;
    # for binary form, check PATH.
    argv = arg_builder(path)
    if argv[0] == sys.executable and len(argv) >= 3 and argv[1] == "-m":
        import importlib.util
        if importlib.util.find_spec(argv[2]) is None:
            return 0
    elif not shutil.which(argv[0]):
        return 0

    try:
        result = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=str(REPO_ROOT),
        )
    except (subprocess.TimeoutExpired, OSError):
        # Linter hung or crashed — don't block the edit; just stay silent.
        return 0

    # Lint clean → exit silently (success is the default state).
    if result.returncode == 0:
        return 0

    # Lint issues found → surface them on stderr so the user sees the
    # output in the same context as the edit they just made.
    print(
        f"[lint-after-edit] {argv[0]} flagged issues in {rel}:",
        file=sys.stderr,
    )
    if result.stdout.strip():
        print(result.stdout.rstrip(), file=sys.stderr)
    if result.stderr.strip():
        print(result.stderr.rstrip(), file=sys.stderr)

    # Always exit 0 — this hook is informational, never blocking.
    return 0


if __name__ == "__main__":
    sys.exit(main())
