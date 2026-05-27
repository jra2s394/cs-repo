# Audit Cadence

What to re-run periodically so the repo doesn't drift from the state 22+ rounds of audit work landed it in. None of these run automatically — they're operator-driven on the schedule below.

## Quarterly (recommended)

Pick one day per quarter (the first Monday after end-of-quarter, e.g.) and walk this list. Allow ~90 minutes.

### Step 1 — Dependency / CVE scan

```bash
.venv/bin/pip-audit -r requirements-dev.txt
npm audit
```

Both should return zero. If `pip-audit` reports CVEs, check whether the pinned versions are still safe (the CVE fix may already be in our pin) or whether the pin needs to bump.

### Step 2 — Doc-vs-spec drift (WebFetch against Anthropic docs)

Three URLs that have been the most fertile in prior audit rounds. Open `claude` and ask it to WebFetch each one and cross-check against our current config:

| URL | What to cross-check |
|---|---|
| <https://code.claude.com/docs/en/hooks> | Hook event names in `.claude/settings.json` — verify every event we use is still active |
| <https://code.claude.com/docs/en/mcp> | `.mcp.json` shape — verify stdio entry shape hasn't been deprecated |
| <https://code.claude.com/docs/en/permissions> | `permissions` block in `.claude/settings.json` — check for newly documented hardening keys |
| <https://code.claude.com/docs/en/skills> | Slash-command frontmatter — check for newly documented fields beyond `description` and `argument-hint` |
| <https://code.claude.com/docs/en/settings> | Top-level `settings.json` keys — anything new worth setting? |

Rounds 24, 25, 26, 29 each shipped a fix surfaced by one of these fetches. Reasonable to expect one or two findings per quarter as Anthropic evolves the spec.

### Step 3 — GitHub-side state snapshot

Refresh the state captured in `docs/github-repo-audit.md`:

```bash
gh api repos/jra2s394/cs-repo --jq '{visibility, default_branch, archived, security_and_analysis, delete_branch_on_merge, allow_merge_commit}'
gh api repos/jra2s394/cs-repo/branches/main/protection
gh api repos/jra2s394/cs-repo/branches/main/protection/required_pull_request_reviews
gh api 'repos/jra2s394/cs-repo/branches' --jq '.[].name' | grep -v '^main$' | wc -l   # should be 0
gh api repos/jra2s394/cs-repo/dependabot/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/code-scanning/alerts 2>&1 | head -1
gh api repos/jra2s394/cs-repo/secret-scanning/alerts
```

If any value diverges from `docs/github-repo-audit.md`, update the doc.

### Step 4 — Local hygiene

```bash
# Verify local install isn't carrying stale CVE-vulnerable packages
.venv/bin/pip list --outdated

# Apply retention to local outputs
bash scripts/cleanup-data-outputs.sh --apply

# Re-run the full test + lint matrix
make test && make lint

# Confirm pre-commit hooks still fire (was installed in round-30)
.venv/bin/pre-commit run --all-files
```

### Step 5 — Doc accuracy spot check

Pick three random commits from the last quarter (`git log --since='3 months ago' --pretty=oneline | shuf -n 3`) and verify that any doc claims in their PR descriptions are still true on `main`. Test-count drift is the most common finding.

## Monthly (lighter touch)

- `bash scripts/cleanup-data-outputs.sh --apply` — retention enforcement
- `make test` — confirm CI is still mirror of local
- Skim the [Dependabot PRs](https://github.com/jra2s394/cs-repo/pulls?q=is%3Apr+label%3Adependencies) and merge / dismiss

## On-demand (event-triggered)

| Trigger | Action |
|---|---|
| A new teammate joins | Walk them through `TEAM_SETUP.md` end-to-end. Note what was unclear. Fix the doc. |
| Anthropic releases a new Claude Code version with new hook events / settings keys | Re-run Step 2 above (just the relevant doc URL) |
| A new MCP server is added to `.mcp.json` | Audit it against the four-question test in `/check-setup` (Step 2) and add it to the data-handling appendix in SECURITY.md |
| A teammate leaves | Update `CODEOWNERS`. Rotate any tokens they had access to. Audit `~/.claude/tool-audit.log` for recent activity. |
| A CVE is published against a pinned dep | Bump the pin. Re-run Step 1. |

## Annually

- Review `LICENSE` — still appropriate?
- Review `CODEOWNERS` — still reflects the team?
- Review `SECURITY.md` retention policy — still 30 days?
- Review managed-settings deployment (if used) — still aligned with org policy?
- Review `pyproject.toml::requires-python` — bump if a Python version reaches end-of-life

## Detection record

These audit rounds produced the cadence above. If you ever wonder "why is this checklist on this schedule?", the answer is mostly "rounds 24/25/26/29 and the 40-series each found one drift per round when run quarterly."

| Round | Finding | Source |
|---|---|---|
| 24 | `.mcp.json` shape doc was wrong | WebFetch /en/mcp |
| 25 | `statusMessage` + `timeout` missing from 53 hook configs | claude-code-guide subagent |
| 26 | `argument-hint` frontmatter missing from 44 commands | WebFetch /en/skills |
| 27 | Python 3.10+ requirement undeclared | pip-audit failure |
| 29 | `disableBypassPermissionsMode` not set; pre-commit `detect-private-key` false-positive | WebFetch /en/permissions + `pre-commit run` |
| 40 | No Python type checking despite 13 hook files; one real bug (untyped Counter local) | manual scout for static-analysis gaps |
| 41 | `PostToolUseFailure` hook unwired (failed tool calls vanished from audit log); `autoUpdatesChannel` defaulted to `latest` instead of `stable` | WebFetch /en/hooks + /en/settings |
| 42 | `--cov-fail-under` unset (coverage could silently decay between rounds) | internal scout — pytest config drift |
| 43 | `session-to-obsidian.py main()` 90+ lines untested; coverage floor stuck at 70 until orchestration was tested | round-42 carry-over (coverage report on `main`) |
| 44 | `disableSkillShellExecution` unset (skills could run inline shell); Detection record above stopped at round 29 | WebFetch /en/settings + manual scout for cumulative drift |
| 45 | Zero of 44 commands used `allowed-tools` frontmatter (every command had implicit access to every tool) | WebFetch /en/skills cross-check against `.claude/commands/*.md` frontmatter |
| 46 | Zero commands used `disable-model-invocation` (Claude could auto-fire manual write commands like `/escalate`); JS had ~1500 LOC tested but zero coverage tracking | WebFetch /en/skills (re-fetched) + scout against c8/coverage tooling absence |
| 47 | Doc drift across README/CONTRIBUTING/RELEASE_NOTES after 7 rounds of code changes (stale test counts, missing make targets, missing CI checks) | manual scout for doc-vs-reality drift |
| 48 | 6 hooks duplicated the same stdin-JSON parse boilerplate (4 lines × 6 = 24 lines that had to stay in sync) | internal simplification scout |
| 49 | `.claude/settings.json` had 52 individual matcher blocks for `draft-before-create` (one per MCP tool) — 470 lines of boilerplate | internal simplification scout (carry-over from 48) |
| 50 | `ruff.toml::target-version` stuck at `py39` despite project requiring 3.10+ since round 27; rule set was 4 groups when 8 catch real bugs (B905 zip-strict, RUF059 unused-unpacked, SIM105 suppressible-exception, RUF012 mutable-class-default) | manual scout via `ruff check --select=E,F,B,UP,SIM,C4,PIE,RUF` |
| 51 | 16 manual report commands missing `disable-model-invocation` (round-46 covered the 8 most obvious; reports were the next layer) | round-46 carry-over (CLAUDE.md command tables) |
| 52 | 4 high-risk customer-facing commands had no `allowed-tools` restriction despite handling untrusted external input | round-45 carry-over (CLAUDE.md customer intelligence table) |
| 53 | Bash sandbox unenabled (biggest unaddressed security feature) | WebFetch /en/sandboxing + cross-check against `.claude/settings.json` |
| 54 | Round-53 sandbox enabled but `gh` immediately failed TLS under macOS Seatbelt — exact issue the doc warned about; `excludedCommands: ["gh *", "git *"]` was the documented fix | reproduced in the same session that committed round 53 (concrete repro, not a scout) |
| 55 | USER_GUIDE.md test counts 4-places stale (728→841); rounds 45-54 added safety layers (sandbox, allowed-tools, disable-model-invocation) that weren't mentioned anywhere user-facing | manual scout for doc-vs-feature drift |
| 56 | macOS TCC protection had spread to every hook file + every `.claude/commands/*.md` since round 53 — pre-commit `end-of-file-fixer` failing locally; `/inbox-triage` + `/kb-draft` still missing `disable-model-invocation` (round-52 carry-over) | local `pre-commit run --all-files` failure + non-destructive `os.O_RDWR` open probe |
| 57 | Same Seatbelt TLS issue that hit `gh` in round 53/54 confirmed broken on `pip` and `npm` too — quarterly audit-cadence pip-audit/npm audit would silently break without the fix; JS branch coverage at 50.88% had no enforced floor | tried `pip list --outdated` + `npm outdated` → both failed with `OSStatus -26276` |
| 58 | Sandbox docs in rounds 53-56 didn't mention Windows — native Windows isn't supported by Claude Code's sandbox (only WSL2), so a Windows user reading "What else keeps you safe" wouldn't know they need WSL2 for parity | user-prompted ("are we making this pc friendly too?") |
| 59 | Auto-mode classifier reads `CLAUDE.md` for context but CLAUDE.md had no positive "trusted infrastructure" prose — only "draft before X" / "never auto-send" rules; several rounds' self-mod prompts were classifier false positives from missing context | WebFetch /en/auto-mode-config |
| 60 | `/tasks` collided with the bundled Claude Code built-in `/tasks` (list background tasks); built-in shadows custom commands so users typing `/tasks` got the wrong functionality silently — same class as round-24's `/review` → `/review-code` rename | WebFetch /en/commands + cross-check against `.claude/commands/*.md` |
| 63 | First explicit no-drift audit outcome: walked all 31 files under `slabstack-cs/` for staleness — no findings. Onboarding video status counts, KB plan counts, customer-master schema, QBR templates all current. Template tokens like `[Issue]`/`{{customer_name}}` correctly identified as intentional, not placeholder cruft. | manual content audit (round-60 plan) |
| 64 | No verification hooks (only safety hooks) — lint feedback came only from `make lint` or CI, not at edit-time. `lint-after-edit.py` PostToolUse(Edit\|Write) hook runs ruff/biome on the modified file, surfaces findings on stderr, never blocks the edit | WebFetch /en/best-practices ("Use hooks for actions that must happen every time with zero exceptions") |
| 65 | CLAUDE.md was 478 lines — Anthropic best-practices doc explicitly warns "Bloated CLAUDE.md files cause Claude to ignore your actual instructions." Extracted full slash commands tables (95 lines → 5 paragraph), Tools dup (14→0), Format House Style (39→pointer to docs/STANDUP_FORMAT.md), Content Standards (30→pointer), MCP Precision Notes (10→pointer), GitHub branch protection (18→pointer), Repo Structure (22→0) | WebFetch /en/best-practices |
| 66 | After round 65 still 278 lines with 4 sections of pure template placeholders (Intercom IDs, Asana GID, Key People, Recurring Customers) — placeholders give Claude no actual info; SETUP.md duplicates the how-to. Moved to docs/templates/CLAUDE_MD_PERSONAL_TEMPLATE.md | round-65 carry-over |
| 67 | Pre-commit hooks pinned at v5.0.0 since round 27 (autoupdate bumps to v6.0.0); SETUP.md still had a `/tasks` reference round 60 missed | manual scout for stale-pin drift + grep for /tasks leftovers |
| 68 | No ConfigChange hook despite /en/security explicitly recommending one — settings.json edits left no forensic trail. `config-change-audit.py` mirrors the audit-log.py shape for config events | WebFetch /en/security |
| 69 | Round 62's subprocess coverage left 3 hooks at 0%/33% because `.coveragerc` had `source = hooks, lib` (relative path) — coverage resolved it relative to subprocess cwd (tmp_path) and source filter rejected everything. Fix: `${COV_REPO_ROOT}/...` env-var expansion. Coverage 82→92% | sqlite3 inspection of empty subprocess .coverage.* files revealed zero file rows — pointed at source-filter rejection |
| 70 | Smoke fixtures passed empty arrays for optional fields and omitted rich fields entirely — reports skipped the conditional render sections. JS lines 82→89%, branches 51→54% | manual scout via per-file coverage report; pattern recognition across reports with similar uncovered line ranges |
| 72 | `.claude/worktrees/` missing from `.gitignore` — Anthropic /en/worktrees explicitly recommends adding it so worktree contents don't appear as untracked files in the main checkout. Other three swept docs (`/en/managed-mcp`, `/en/agent-teams`, `/en/checkpointing`) produced no drift: managed-mcp is admin-fleet-only, agent-teams is experimental opt-in, checkpointing is automatic with no repo-level config required | WebFetch /en/managed-mcp + /en/agent-teams + /en/worktrees + /en/checkpointing |
| 73 | Makefile calls `python3` literally, so `make test` resolves to Apple's `/usr/bin/python3` (3.9.6) unless the venv is activated first — every `zip(strict=True)` etc. from round-50 B905 fails locally despite passing in CI. Fix: shipped `.envrc` (`source .venv/bin/activate`) so direnv-using contributors auto-activate; CONTRIBUTING.md documents the opt-in setup | reproduced live in the same session that committed round 72 (12 `TestBarChart` failures on local Python 3.9; passed after activating .venv→3.12) |
| 78 | 5 new admin settings landed in v2.1.129–v2.1.136 that round-33's `MANAGED_SETTINGS.md` doesn't mention: `strictPluginOnlyCustomization` (v2.1.129+, locks skills/agents/hooks/mcp customization surfaces), `parentSettingsBehavior` (v2.1.133+, parent-managed merge policy), `policyHelper` (v2.1.136+, dynamic per-machine settings via admin executable), `skillOverrides` (v2.1.129+, per-skill visibility without editing SKILL.md), `allowManagedMcpServersOnly` (round-72 sweep missed this — locks the MCP allowlist to managed sources). All 5 documented in MANAGED_SETTINGS.md + 4 wired in the example JSON (policyHelper kept as documented reference) | WebFetch /en/settings + /en/skills + /en/sub-agents |
| 79 | No custom subagents defined (`.claude/agents/` didn't exist) despite the doc-fetch sweep in round 78 surfacing the feature. Added `code-reviewer` as the first subagent — references `.claude/commands/review-code.md` as the canonical checklist source so the two stay in sync; restricted to Read/Grep/Glob/Bash (no write tools, no MCP). New `tests/test_agents_frontmatter.py` enforces frontmatter contract (description ≥40 chars + tools + model required); CLAUDE.md gains a Subagents section. First step of a planned 4-round sequence (79=subagent, 80=`/code-review` disambiguation, 81=auto-mode research, 82=coverage push) | round-78 carry-over + WebFetch /en/sub-agents |
| 80 | Anthropic ships a bundled `/code-review` skill that doesn't collide directly with our `/review-code` (different names) but could confuse users typing into `/`. Three disambiguation notes added: CLAUDE.md slash-commands section + USER_GUIDE.md /review-code section explain the difference and point at `/skills` for users who want to hide the bundled one; CONTRIBUTING.md gets a dev-facing heads-up about it. Deliberately did NOT add `skillOverrides` to project `.claude/settings.json` — focused WebFetch of /en/skills confirmed the standard pattern writes overrides to `.claude/settings.local.json` (per-user, gitignored), so committing one to the shared project file would force a behavior change on teammates who might want the bundled skill | WebFetch /en/skills (focused) for `skillOverrides` tier semantics |
| 82 | `hooks/lint-after-edit.py` was at 83% individual coverage (overall 92% saves CI; but per-file gaps mask real branches). Three uncovered code paths exercised: relative-path normalization (line 74), SKIP_PREFIXES hit with a file that actually exists on disk (line 91 — existing tests used non-existent paths that bailed at the `path.exists()` check first), and unsupported-extension inside the repo (line 96 — existing test used tmp_path which is outside REPO_ROOT so it bailed at `relative_to()` ValueError instead). New `TestBranchCoverage` class adds 3 targeted tests. Lifted lint-after-edit 83→88%, overall 92→93%. Remaining 6 uncovered lines (106-108, 118-120, 135) are defensive paths — linter-missing, subprocess-timeout, stderr-only output — not worth contrived mocking. `notify.py` left at 80% for similar reason (the 2 uncovered lines are a bare `except Exception` defensive block; only realistic failure mode is FileNotFoundError which IS tested). Round 81 (`disableAutoMode` research) skipped per user direction — they want auto-mode on | local scout: per-file coverage report + line-by-line trace of which test bails where |
| 83 | Three drift fixes from a /en/sandboxing + /en/hooks scout: (a) `sandbox.failIfUnavailable` unset — default behavior on Seatbelt init failure is warn + silent fallback to unsandboxed, so an OS update could quietly remove protection. Set to `true` in `.claude/settings.json` for hard-fail. (b) Same field + `allowUnsandboxedCommands: false` (Strict Sandbox Mode) added to `examples/managed-settings.example.json` + `MANAGED_SETTINGS.md` for fleet deployments. (c) GitHub repo description said "11 safety hooks" — actual is 13 (round 64 + round 68 additions). Patched via `gh api PATCH`. Round 84 (hook events doc expansion against the 29 events in /en/hooks) is the planned follow-on | WebFetch /en/sandboxing + /en/hooks + `gh api` repo state snapshot |
| 84 | Round-77 sweep documented 8 hook events (the ones we wire); /en/hooks lists 29 events total — 21 documented neither in `hooks/README.md` nor `docs/ARCHITECTURE.md`. Expanded both files: hooks/README.md gets a new "Available events" section with a 7-category reference table (tool-use, session lifecycle, user input, context window, subagents/tasks, workspace, MCP) marking which 8 we wire; ARCHITECTURE.md keeps the wired-events deep dive but adds a paragraph naming the most likely next wiring candidates (`SubagentStart`/`SubagentStop` now that round 79 added a subagent, `PostCompact`, `WorktreeCreate`/`WorktreeRemove`). Round 84 is doc-only; round 85 (if scoped) would actually wire `SubagentStart`/`SubagentStop` into `audit-log.py` | WebFetch /en/hooks (round-83 scout) cross-checked against `.claude/settings.json` wired events |
| 85 | Round-79 added the `code-reviewer` subagent but its lifecycle wasn't logged anywhere — invocations vanished from the audit trail. Wired `SubagentStart` + `SubagentStop` to `audit-log.py`: hook now reads `hook_event_name` and switches log format (uses `agent_type` instead of `tool_name`, status `START`/`STOP` instead of `OK`/`FAIL`). Settings.json gained 2 new event blocks (per-edit auth granted by user); audit-log.py gained 8 lines of dispatch logic; new `TestSubagentEvents` class adds 4 tests covering: start, stop, missing-agent-type fallback, and that a subsequent regular tool call isn't affected by the new code path. Also closed two adjacent CLAUDE.md `## Active hooks` table gaps that round-77 missed — `lint-after-edit.py` (round 64) and `config-change-audit.py` (round 68) weren't in the table at all. Wired events: 8 → 10. Detection-record + ARCHITECTURE.md "next candidates" list refreshed (no longer name SubagentStart/Stop) | Round-84 carry-over — the doc already named this as the natural follow-on |
| 86 | Three bundled findings from a /en/permissions + /en/best-practices scout: (a) `.claude/commands/review-code.md` had stale strings — line 5 referenced "728 tests (571 Python + 157 JS)" (actually 878 = 721 + 157) and Section 19b said `target-version py39` (round 50 raised it to `py310`). Surfaced by the round-85 code-reviewer subagent run. (b) `/en/permissions` documents an `Agent(<name>)` permission rule pattern that lets fleet admins deny specific subagents (built-in or custom). Round 79 introduced our first custom subagent + round 78 expanded MANAGED_SETTINGS.md, but neither doc mentioned `Agent()` rules. Added a "Controlling subagent access" section with both `Agent(Explore)` and `Agent(code-reviewer)` examples. (c) Custom subagents in `.claude/agents/` aren't exposed via the SDK / scripted Agent tool's `subagent_type` enum (only built-in types). Discovered round 85 trying to invoke `code-reviewer` from a scripted call. Documented in CLAUDE.md's Subagents section with the fallback pattern (spawn `general-purpose` with the subagent's prompt inlined) | WebFetch /en/permissions + /en/best-practices + round-85 memory carry-over |
| 87 | Two drift classes the round-86 sweep didn't catch: (a) `/tasks` → `/my-tasks` (renamed round 60) leftovers in 3 command files — `.claude/commands/setup.md` (4 occurrences at lines 92/214/230/255), `.claude/commands/commands.md` (1, Customer intelligence bucket), and `.claude/commands/meeting-notes.md` (1, Step 4 follow-up list). Round 60 + round 67 both swept for these but limited their grep to top-level docs/; the `.claude/commands/` directory was never grepped. (b) Test-count claims drifted 869 → 878 (712 → 721 Python; +9 since the user-facing docs were last refreshed). Round 86 fixed this in `.claude/commands/review-code.md` but missed the README/USER_GUIDE/COMMAND_GUIDE trio. Updated 6 files total. Memory updated (`feedback_doc_drift_sweep.md`) so the next scout grep includes `.claude/commands/` in its target list | manual doc-drift scout — grep `/tasks\b` (excluding `/my-tasks`) + grep `[0-9]{3,4} (tests\|passed\|Python\|JS)` across user-facing docs |
| 88 | `hooks/README.md:11` prose said "currently wires 8 events" with the original 8-name list, but round 85 bumped wired events 8 → 10 (`SubagentStart` + `SubagentStop`). The same file's line 32 said "wires 10" and the per-event table marked both new events ✓ wired — so the file contradicted itself across three locations. Same drift class as round 87 (prose count not refreshed after the table was). One-line fix: count 8 → 10 + two event names appended | round-87 follow-on — same drift class, checked hook-count prose against the round-85 wiring change |
