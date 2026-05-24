# Contributing

This is a community project. Contributions are welcome: new hooks, skills, patterns, convention doc
templates, bug fixes, and documentation improvements.

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
| `make test-cov`   | pytest with coverage report |

CI runs the same `make` targets, so if it's green locally it'll stay green on PR.

## Scrub checklist

Before submitting, verify:

- [ ] No company or org names
- [ ] No personal names, emails, or usernames
- [ ] No API tokens or paths to personal directories
- [ ] No team-specific project IDs
- [ ] Placeholder values used for anything org-specific (e.g., `{{YOUR_ORG}}`)

## Style guide

- Write like a human, not a language model
- No em dashes
- Keep docs concise
- Code blocks should be copy-pasteable
- Comments in hooks and scripts should explain "why", not "what"

## What we won't merge

- Hooks or skills that are too specific to one org's workflow
- Anything that requires a paid service to function (unless clearly marked optional)
- Contributions with personal info that wasn't scrubbed
