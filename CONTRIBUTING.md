# Contributing

This is a community project. Contributions are welcome: new hooks, skills, patterns, convention doc
templates, bug fixes, and documentation improvements.

**Before you start:** read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the command-execution flow, then [docs/COMMAND_GUIDE.md](docs/COMMAND_GUIDE.md) if you're adding a new slash command. For runtime failures while developing, [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) is the recovery guide.

## What makes a good contribution

**Hooks** should solve a real problem you've hit. Include inline comments explaining what the hook
does and how to customize it. Include the `settings.json` registration snippet.

**Skills** follow the existing format (name, description, trigger conditions in frontmatter). Explain
when to use the skill and when not to.

**Slash commands** (files in `.claude/commands/*.md`) must start with a `---` frontmatter block
containing a non-empty, single-line `description:` field (≥ 20 chars, no `TODO`/`TBD`/`WIP`
placeholders, no trailing ellipsis). This is enforced by `tests/test_commands_frontmatter.py` —
both `/commands` and CLAUDE.md tables read from this field. After adding a new command, also
register it in CLAUDE.md's relevant command table and in `USER_GUIDE.md`'s quick-reference table.

Optional frontmatter fields (see <https://code.claude.com/docs/en/skills> for the full list):

- `argument-hint: <customer> [quarter]` — shown in autocomplete to indicate expected args. Use `<...>` for required, `[...]` for optional. The frontmatter test validates the bracket shape when this field is present.
- `disable-model-invocation: true` — only the user can invoke (Claude can't auto-trigger). Useful for commands with side effects.
- `allowed-tools: Bash(git status *) Read` — pre-approve specific tools when the command is active.
- `when_to_use: ...` — extra trigger-phrase context for the classifier, appended to `description`. Counts toward the 1,536-character cap; use when the description alone doesn't fully cover when Claude should invoke the skill.
- `arguments: customer quarter` — named positional arguments for `$name` substitution in the body. Accepts a space-separated string or YAML list; names map to argument positions in order.
- `model: opus` / `effort: high` — per-command model or effort override.
- `shell: bash` (default) or `powershell` — shell used for any inline `` !`command` `` or ` ```! ` blocks in the skill body. Setting `powershell` requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`.

Note: `.claude/commands/*.md` files keep working, but Anthropic's docs now recommend the equivalent `.claude/skills/<name>/SKILL.md` shape for new work — it adds supporting files, dynamic context injection, and auto-loading. Migration is not required.

**Patterns** follow the Problem/Pattern/Implementation/Example structure. Must be based on real
usage, not theoretical.

**Convention doc templates** should be generic enough to apply to most projects of that type.

## How to contribute

1. Fork the repo
2. Create a branch: `feat/my-hook-name`
3. Add your files
4. Run `make test` and `make lint` — both must be green before opening a PR
5. Run the scrub checklist below
6. Open a PR with a clear description of what the contribution does and why

## Local test + lint workflow

**Requirements:** Python ≥ 3.10 and Node ≥ 18. The pins in `requirements-dev.txt` (pytest ≥ 9.0.3, pillow ≥ 12.2.0, matplotlib ≥ 3.10.9) all require Python 3.10+; pip will fail with `Could not find a version that satisfies the requirement` on Python 3.9 (which is what macOS ships by default). CI uses Python 3.11. The minimum is also enforced in `pyproject.toml` via `requires-python`.

**Recommended setup — project-local venv** (keeps `/usr/bin/python3` untouched, gives you a known-clean dependency set, isolates this repo from anything else on your machine):

```bash
# One-time, if your system Python is too old:
brew install python@3.12                 # macOS; or apt/dnf install python3.12

# One-time per clone:
python3.12 -m venv .venv                 # creates ./.venv/ (already .gitignored)
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements-dev.txt pre-commit
.venv/bin/pre-commit install             # wires the hooks at .pre-commit-config.yaml into git commit
npm install                              # docx (runtime) + biome (lint)

# Every session: activate first
source .venv/bin/activate

# Or invoke the venv tools directly without activating:
make test                                # works once activated
.venv/bin/python -m pytest               # works without activation
```

**Optional — auto-activate with direnv.** The repo ships a `.envrc` that runs `source .venv/bin/activate` whenever you cd into the directory. To opt in:

```bash
brew install direnv                      # macOS; or apt/dnf install direnv
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc   # bash users: replace zsh with bash
direnv allow                             # one-time per repo, authorizes the .envrc
```

After that, `make test` and ad-hoc `python3` calls inside the repo always use the venv's Python 3.12 — no more "works in CI, fails locally" from accidentally hitting Apple's 3.9.

The `pre-commit install` step is important — without it the `.pre-commit-config.yaml` rules only fire if you manually run `pre-commit run --all-files`. With it, they fire automatically on every `git commit` and block the commit on failure. CI runs the same hooks on every push as a safety net, so an unconfigured local doesn't reach `main` broken.

If you already have Python ≥ 3.10 on `$PATH`, the venv is optional — `make install-dev` + `make test` directly against your system Python works too. CI uses the system-Python path (no venv).

```bash
make install-dev   # one-time: installs pytest, ruff, matplotlib, pillow
npm install        # one-time: installs docx (runtime) and biome (lint)

make test          # full suite — Python (pytest) + JS (5 suites)
make lint          # ruff (Python) + biome (JS)
```

Subtargets if you only need part of it:

| Command | What it runs |
|---|---|
| `make test-hooks`  | Python hook tests only |
| `make test-lib`    | Python lib tests only |
| `make test-js`     | All JS suites |
| `make lint-py`     | ruff only |
| `make lint-js`     | biome only |
| `make typecheck`   | mypy on `hooks/` + `lib/` (added round 40; lenient baseline) |
| `make test-cov`    | pytest with coverage report + `--cov-fail-under=85` threshold (scope: `hooks/` + `lib/`) |
| `make test-js-cov` | JS tests under c8 with `lines=85` + `branches=50` thresholds (config in `package.json::c8`; floor raised from 75 → 85 in round 70) |

CI runs the same `make` targets, so if it's green locally it'll stay green on PR.

> **Subprocess coverage for hooks.** Hooks under `hooks/` are tested as subprocesses via `tests/conftest.py::run_hook`. Round 62 wired `COVERAGE_PROCESS_START` + a `.pth` bootstrap so subprocesses are instrumented, and round 69 fixed a cwd resolution bug (`${COV_REPO_ROOT}/hooks` env-var expansion in `.coveragerc`) that had three hooks showing 0–33% coverage. Combined with `--parallel`, the `.coverage.*` files are merged at report time. Current measured coverage: **~92% line coverage across `hooks/` + `lib/`**, comfortably above the 85% floor.

> **Heads-up on bundled `/code-review`.** Anthropic ships a bundled `/code-review` skill alongside our `/review-code` slash command. Different names, different behavior — ours runs `make test` + `make lint` + the 23-section repo checklist (and round-79 added a `code-reviewer` subagent). If the bundled one is distracting in your `/` menu, suppress it per-user via `/skills` → highlight `code-review` → Space to cycle to `"off"` → Enter to save. The menu writes to `.claude/settings.local.json` (gitignored), so it stays a personal preference and doesn't affect teammates.

## Scrub checklist

Before submitting, verify:

- [ ] No company or org names
- [ ] No personal names, emails, or usernames
- [ ] No API tokens or paths to personal directories
- [ ] No team-specific project IDs
- [ ] Placeholder values used for anything org-specific (e.g., `{{YOUR_ORG}}`)

## Style guide

- Write like a human, not a language model
- Keep docs concise
- Code blocks should be copy-pasteable
- Comments in hooks and scripts should explain "why", not "what"

## What we won't merge

- Hooks or skills that are too specific to one org's workflow
- Anything that requires a paid service to function (unless clearly marked optional)
- Contributions with personal info that wasn't scrubbed
