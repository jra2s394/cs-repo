# Security Policy

This repo is a public CS Ops automation suite. It connects to live work accounts (Gmail, Calendar, Drive, Asana, Intercom, Slack, Shortcut) through Claude Code MCP integrations and never stores credentials in the repo itself. If you've found a security issue, please follow the reporting steps below.

## Reporting a vulnerability

**Preferred:** open a private vulnerability report via GitHub's "Report a vulnerability" button under the repo's **Security** tab. This keeps the report private to the maintainer until a fix is ready.

**Alternative:** email the maintainer (see the repo profile for the current contact address) with subject `[SECURITY] cs-repo: <short summary>`. Please include:
- A description of the issue and why you believe it's a security concern
- Steps to reproduce (if applicable)
- Affected files or commands
- Suggested fix (optional)

We aim to acknowledge reports within 3 business days and to ship a fix or mitigation within 30 days for confirmed issues. Coordinated disclosure preferred — please give us a reasonable window before public disclosure.

## In scope

- Code in this repo: `hooks/`, `lib/`, `reports/`, `scripts/`, `.claude/commands/`
- Slash command prompts that could be coerced into unsafe actions
- Hook bypass techniques
- Tests, CI configuration, and the Makefile
- Documentation that could mislead a user into an unsafe action

## Out of scope

- **Third-party MCP servers** (Gmail, Asana, Intercom, etc.) — report to those vendors directly
- **The customer's data** in any connected system — that's protected by the customer's own access controls and the MCP integration's permission model
- **Forks of this repo** — each forker is responsible for their own security policy; this file applies to the canonical `jra2s394/cs-repo` repo only
- **Vulnerabilities in Claude Code itself** — report to Anthropic (https://anthropic.com/responsible-disclosure)
- **Social engineering** of repo users
- **Issues that require an attacker to already have full local access** to a user's machine

## Existing safeguards

This repo ships with multiple defense layers. If you find a way around any of them, that's in scope:

- **`hooks/secret-scan.py`** — blocks `git commit` when staged content matches known token patterns (Shortcut, GitHub `ghp_`/`gho_`/`ghs_`/`ghu_`/`ghr_`, OpenAI legacy + project-keys, Anthropic, Stripe live (sk_live/pk_live), Twilio, GCP service account, Slack `xox[abcdepsr]-`, AWS access key + secret, Google API, RSA private key, JWT). Stripe test keys (`sk_test_`/`pk_test_`) emit a warning but do not block.
- **`hooks/push-guard.py`** — blocks `git push --force`, pushes to `main`/`master`, `gh pr merge`, `gh repo edit --visibility public` (private→public flip), and Bash-level writes to `.env` files
- **`hooks/file-protector.py`** — blocks Edit/Write to `.env`, `.env.*`, private keys, credential files, and `.git/` internals
- **`hooks/branch-enforcer.py`** — blocks `git commit` directly on `main`/`master`; pairs with GitHub branch protection so risky commits fail at the local layer first
- **`hooks/draft-before-create.py`** — forces a permission prompt before any write to Slack, Asana, Intercom, Shortcut, Gmail, Google Calendar, or Google Drive (destructive deletes are gated separately by `permissions.deny`)
- **`hooks/block-attribution.py`** — blocks AI-attribution strings in commit messages
- **`hooks/audit-log.py`** — appends every tool invocation (Bash, Edit, MCP, etc.) to `~/.claude/tool-audit.log` for forensic review; non-blocking, rotates at 5 MB. Distinguishes successful calls (`OK`) from failed ones (`FAIL`) via the `PostToolUseFailure` event, so a hook-bypass attempt that errors out still leaves a trace.
- **`hooks/config-change-audit.py`** — appends every config-file change to `~/.claude/config-change.log` (settings.json edits at any scope, plus skill/agent frontmatter changes); non-blocking, rotates at 5 MB. Per `/en/security`: "Audit or block settings changes during sessions with ConfigChange hooks." This is the audit half — closes the forensic gap where mid-session settings tampering would otherwise leave no record.
- **`.claude/settings.json` `permissions.deny`** — hard-denies six destructive MCP calls at the harness level: Asana `delete_task` + `create_project_status_update`, Calendar `delete_event`, Shortcut `stories-delete` / `epics-delete` / `iterations-delete`
- **`.claude/settings.json` `disableBypassPermissionsMode: "disable"`** — prevents `bypassPermissions` mode from being activated, even from the CLI. Closes the "I'll just YOLO mode this" escape hatch.
- **`.claude/settings.json` `disableSkillShellExecution: true`** — blocks inline shell execution from any skill (`` !\`...\` `` and ` \`\`\`! ` markdown forms). Removes a class of skill-hijack attacks.
- **`.claude/settings.json` `sandbox`** — OS-level Bash sandbox using macOS Seatbelt or bubblewrap on Linux/WSL2. Denies reads to `~/.ssh`, `~/.aws`, `~/.gnupg` so a compromised command can't exfiltrate credentials; network access is allowlist-only for known-good endpoints. **Platform support:** macOS (built-in, no install), Linux + WSL2 (requires `bubblewrap` + `socat`), **native Windows is NOT supported by the sandbox** — Windows users need to run Claude Code inside WSL2 to get this protection. Without the sandbox the other defense layers (hooks, draft-before-create, denyRead via permission rules) still apply, but you lose the OS-level enforcement. `gh`, `git`, `pip`, `pip3`, `npm`, `npx` are excluded from the sandbox (Go-based CLIs and language package managers don't trust the macOS keychain under Seatbelt — documented limitation).
- **Command frontmatter `allowed-tools`** — 7 commands (`/inbox-triage`, `/escalate`, `/follow-up`, `/kb-draft`, `/commands`, `/standup-recap`, `/prs`) are restricted at the runtime to only the work-app tools they actually need. A prompt-injected command can't reach a tool that isn't in its list.
- **Command frontmatter `disable-model-invocation: true`** — 28 manual-only commands (every standup, every report, every write-action command) can't be auto-fired by Claude based on conversation context. The user must explicitly type the slash command.
- **GitHub branch protection** on `main` (server-side) — enforces PR-only flow, blocks force pushes, requires linear history

## What's NOT in the repo

The following are deliberately kept out of the repo (gitignored):
- `.env` and `.env.*` (except `.env.example`)
- `.mcp.json` (contains MCP server URLs which may include tokens)
- `data/outputs/*` (generated standup files may contain customer-identifying info)
- `out/*.docx` / `out/*.csv` (generated reports)
- `*.xlsx` / `*.csv` / `*.pdf` (Finance sheets with customer + billing data)
- `~/.claude/CLAUDE.md` (per-teammate personal config with name, email, Intercom ID — lives outside the repo entirely)

## Token leak response

If you discover that a token has been committed to this repo:

1. **Rotate the token immediately** at the issuing service (don't wait for the report to be triaged)
2. Report it via the channels above so we can:
   - Verify and confirm scope
   - Audit `git log -p` for the exposure window
   - Add a new pattern to `hooks/secret-scan.py` if the existing patterns missed it
3. Note: rewriting git history to remove a committed token is **not sufficient** — assume the token is compromised the moment it lands on a remote

## Customer PII

This repo handles customer names, emails, and domains in its slash commands at runtime, but **never commits them**. The scrub checklist in `.github/pull_request_template.md` exists to catch accidental PII commits. If you find PII in committed files, report it as a security issue.

## Data handling appendix

Where customer data actually flows when the slash commands run. The repo's *code* never persists customer data to disk except for the local-only artifacts called out below.

| Data class | Where it lives | Brokered by | Persisted locally? |
|---|---|---|---|
| Intercom conversations, contacts, articles | Intercom's servers | Intercom MCP integration | Only in `data/outputs/intercom-*-metrics-*.json` (aggregated counts, no raw conversation text) and the generated `out/*.docx` reports (top-customer rollups; no per-message bodies). |
| Asana tasks, projects, comments | Asana's servers | Asana MCP | Only in generated `out/Onboarding_*.docx` task-health tables (task names, assignees, statuses). |
| Gmail threads | Google's servers | Gmail MCP | Drafts only — written via `create_draft`, never `send`. Body text is held in Claude Code's session memory, not written to disk by this repo. |
| Google Calendar events | Google's servers | Calendar MCP | Read-only for `/meeting-prep` / `/follow-up` / `/meeting-notes`. Event titles + attendees may appear in standup `.md` files in `data/outputs/`. |
| Google Drive folders | Google's servers | Drive MCP | Folder paths only (used by `/start-onboarding` to scaffold per-customer folders). Drive file content is never read into this repo. |
| Slack messages | Slack's servers | Slack MCP | Outbound only — standup drafts written via `slack_send_message_draft`. No inbound DMs or channel reads persist locally. |
| Shortcut stories, epics | Shortcut's servers | Shortcut MCP | Story titles + IDs only, in `out/*.docx` engineering-review tables. |
| Finance renewal data (CARR, ARR) | Excel files supplied by Finance team | Local file read | Original `.xlsx` is gitignored; aggregated tables land in `out/Renewals_*.docx`. |

**Brokerage detail:** every MCP call is made by Claude Code's MCP runtime, not by code in this repo. The repo defines *which* tools the agent may call (`.claude/settings.json` `permissions` + the `draft-before-create` hook); it does not handle the network transport or the data payload directly. For the customer-data flow path, see Anthropic's published data-handling docs for the relevant MCP provider.

## Retention policy

The repo's local artifacts (the only ones it can control):

| Artifact | Default retention | How to enforce |
|---|---|---|
| `data/outputs/*.md`, `data/outputs/*.json` | 30 days | `bash scripts/cleanup-data-outputs.sh --apply` |
| `out/*.docx`, `out/*.csv` | 30 days | same script |
| `~/Desktop/CS Reports/**` (the Desktop-copy mirror) | 30 days | same script |
| `~/.claude/tool-audit.log` (auto-rotated at 5 MB → `.1`) | Manual — 2 generations retained by the hook | Hook-managed; bound size limit |
| `~/.claude/session-export.log` (Obsidian-export errors) | No retention enforced | Manual `rm` |
| Obsidian vault session notes (if integration enabled) | Per-user / vault choice | Per the user's vault retention policy |

`scripts/cleanup-data-outputs.sh` is **dry-run by default** — prints what would be removed without removing. Pass `--apply` to actually delete. Pass `--days N` to override the retention window. Recommended cadence: monthly, scheduled via cron or your OS task scheduler. The repo does not run this automatically — retention is an operator choice.
