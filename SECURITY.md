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

- **`hooks/secret-scan.py`** — blocks `git commit` when staged content matches known token patterns (Shortcut, GitHub `ghp_`/`gho_`/`ghs_`/`ghu_`/`ghr_`, OpenAI legacy + project-keys, Anthropic, Stripe live (sk_live/pk_live), Twilio, GCP service account, Slack `xox[abcepsr]-`, AWS access key + secret, Google API, RSA private key, JWT). Stripe test keys (`sk_test_`/`pk_test_`) emit a warning but do not block.
- **`hooks/push-guard.py`** — blocks `git push --force`, pushes to `main`/`master`, `gh pr merge`, and Bash-level writes to `.env` files
- **`hooks/file-protector.py`** — blocks Edit/Write to `.env`, `.env.*`, private keys, credential files, and `.git/` internals
- **`hooks/draft-before-create.py`** — forces a permission prompt before any write to Slack, Asana, Intercom, or Shortcut
- **`hooks/block-attribution.py`** — blocks AI-attribution strings in commit messages
- **`.claude/settings.json` `permissions.deny`** — hard-denies destructive MCP calls (deletes for Asana/Shortcut/Calendar) at the harness level
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
