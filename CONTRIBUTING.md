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
- `model: opus` / `effort: high` — per-command model or effort override.

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
| `make test-hooks` | Python hook tests only |
| `make test-lib`   | Python lib tests only |
| `make test-js`    | All JS suites |
| `make lint-py`    | ruff only |
| `make lint-js`    | biome only |
| `make test-cov`   | pytest with coverage report (scope: `lib/` only — see note) |

CI runs the same `make` targets, so if it's green locally it'll stay green on PR.

> **Why does `make test-cov` only measure `lib/`?** The hooks under `hooks/` are tested via subprocess (`tests/conftest.py::run_hook`), and `coverage.py` doesn't instrument subprocesses. Behavioral coverage of hooks is high (200+ tests across the 11 hook scripts in `tests/hooks/`); they just don't show up in the line-coverage number. See `.coveragerc` for the explicit omit list. `session-to-obsidian.py` is the exception — it's imported directly via `importlib`, so it appears in the report.

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
