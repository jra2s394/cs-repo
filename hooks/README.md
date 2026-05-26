# Hooks

## What Are Hooks?

Hooks are scripts that Claude Code runs automatically at defined points in a session. They can intercept tool calls before they execute, observe them after, react to user input, fire when a session starts or ends, or trigger on desktop notifications. This gives you programmatic control over Claude's behavior without modifying prompts or relying on Claude to remember rules.

Each hook is a shell command (typically a Python script) that receives a JSON payload on stdin describing the event. The hook reads that payload, makes a decision, and communicates back through its exit code and stdout/stderr. Claude Code reads the result and proceeds accordingly.

Hooks can take three actions: **allow** (exit code 0, let the tool call proceed), **block** (exit code 2, cancel the tool call and show an error message from stderr to the user), or **ask** (output a JSON object with `permissionDecision: "ask"`, pause and surface a permission prompt so the user can approve or deny).

Hook types map to lifecycle events: `PreToolUse` fires before a tool executes, `PostToolUse` fires after, `UserPromptSubmit` fires when the user submits a message, `Notification` fires when Claude needs user input, `Stop` fires when a session ends, `SessionStart` fires when a session starts (with an optional `compact` matcher to target post-compaction restarts), and `PreCompact` fires just before Claude Code compacts the conversation context. Hooks are registered in `~/.claude/settings.json` under the `hooks` key, scoped to an event type and optionally filtered by a `matcher` (a regex or tool name pattern).

Hooks run synchronously by default and block execution until they exit, so keep them fast. The `async: true` field in settings.json makes a hook fire-and-forget, useful for Stop hooks that write to disk or call external services.

---

## Hook Lifecycle

1. User or Claude triggers an action (submits a message, calls a tool, ends a session).
2. Claude Code invokes any registered hooks for that event, passing JSON on stdin.
3. The hook reads the event data, runs its logic, and exits.
4. Claude Code reads the result:
   - Exit 0: proceed normally.
   - Exit 2: block the action; show stderr to the user as an error.
   - JSON output with `permissionDecision: "ask"`: pause and prompt the user.
5. Claude continues or stops based on that result.

---

## Hook Reference

| Hook | Event | What it does |
|---|---|---|
| `audit-log.py` | PostToolUse | Logs every tool call to a local audit file |
| `block-attribution.py` | PreToolUse (Bash) | Blocks commits containing AI attribution strings |
| `branch-enforcer.py` | PreToolUse (Bash) | Blocks `git commit` directly on `main`/`master` |
| `push-guard.py` | PreToolUse (Bash) | Blocks `git push` and `gh pr merge` |
| `secret-scan.py` | PreToolUse (Bash) | Blocks `git commit` when the staged diff matches a known token pattern |
| `draft-before-create.py` | PreToolUse (MCP tools) | Forces a permission prompt before creating items in shared systems |
| `file-protector.py` | PreToolUse (Edit, Write) | Blocks edits to `.env` files, private keys, and credentials |
| `compact-reinject.py` | PreCompact | Re-injects critical rules just before context compaction |
| `pr-template-reminder.py` | UserPromptSubmit | Reminds Claude to read and follow the repo's PR template |
| `notify.py` | Notification | Sends a desktop notification when Claude needs input |
| `session-to-obsidian.py` | Stop | Exports the session transcript to an Obsidian vault |
| `lint-after-edit.py` | PostToolUse (Edit, Write) | Runs `ruff` on edited `.py` files and `biome` on edited `.js` files; non-blocking, prints findings to stderr |
| `config-change-audit.py` | ConfigChange | Logs every config-file change (project/local/user settings, skills) to `~/.claude/config-change.log` for forensic review; non-blocking |

---

## Installation

Register hooks in `~/.claude/settings.json` under the `hooks` key. Each event type holds an array of matcher objects; each matcher can run multiple hooks in sequence.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/block-attribution.py",
            "statusMessage": "Checking commit attribution..."
          },
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/push-guard.py",
            "statusMessage": "Checking for push commands..."
          }
        ]
      },
      {
        "matcher": "mcp__your_tool__create_issue|mcp__your_tool__send_message",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/draft-before-create.py",
            "statusMessage": "Enforcing Draft-Before-Create..."
          }
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/file-protector.py",
            "statusMessage": "Checking file protection..."
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/audit-log.py",
            "timeout": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/pr-template-reminder.py",
            "statusMessage": "Checking for PR template..."
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/notify.py",
            "timeout": 10
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/compact-reinject.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/session-to-obsidian.py",
            "timeout": 30,
            "statusMessage": "Exporting session to Obsidian...",
            "async": true
          }
        ]
      }
    ]
  }
}
```

**Notes:**
- `matcher` is a regex matched against the tool name. An empty string matches all tools.
- `statusMessage` is shown in the Claude Code UI while the hook runs.
- `timeout` (seconds) kills the hook if it runs too long. Defaults are generous; set tight timeouts on hooks that run on every call.
- `async: true` makes the hook non-blocking. Use this for Stop hooks that do slow I/O.

---

## Writing Your Own Hook

A hook is any executable that reads JSON from stdin and exits with the right code.

**Minimal allow hook:**
```python
#!/usr/bin/env python3
import sys, json

data = json.load(sys.stdin)
# inspect data["tool_name"], data["tool_input"], etc.
sys.exit(0)  # allow
```

**Block with a message:**
```python
print("BLOCKED: reason here", file=sys.stderr)
sys.exit(2)
```

**Ask for permission:**
```python
import json, sys
output = {
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "ask",
        "permissionDecisionReason": "Review this before it runs."
    }
}
print(json.dumps(output))
sys.exit(0)
```

**Inject context (UserPromptSubmit):**
```python
output = {
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": "Remember: always do X before Y."
    }
}
print(json.dumps(output))
sys.exit(0)
```

**Rules of thumb:**
- Always wrap `json.load(sys.stdin)` in a try/except and exit 0 on parse failure. Don't let a malformed payload block work.
- Never exit 2 from a Stop hook. If the hook fails, log and exit 0 so the session can close.
- Keep PreToolUse hooks fast. They run on every matching tool call; a slow hook adds latency to everything.
- Test with `echo '{"tool_name":"Bash","tool_input":{"command":"echo hi"}}' | python3 your-hook.py`.

---

## Individual Hook Docs

### `audit-log.py`

**What it does:** Appends a timestamped line to `~/.claude/tool-audit.log` on every tool call: timestamp, session ID (first 8 chars), tool name, and working directory. Never blocks. Failures are silently ignored.

**Event:** PostToolUse, matcher: `""` (all tools)

**Customize:** Change `log_path` to write logs elsewhere. Add fields from the `data` dict (e.g. `tool_input`) to capture more detail per call.

---

### `lint-after-edit.py`

**What it does:** Verification hook (non-blocking, informational). After Claude edits a `.py` or `.js` file, runs the appropriate linter (`ruff check` for Python via `python3 -m ruff`, `biome check` for JS via `npx --no-install biome`) and surfaces any findings on stderr. Lint-clean files produce no output. Always exits 0 — the hook makes lint feedback visible, it does NOT block the edit. Skips files under generated/cache/output dirs (`node_modules/`, `.venv/`, `out/`, `data/outputs/`, etc.) and files outside the repo.

**Event:** PostToolUse, matcher: `Edit|Write`

**Customize:** Add file extensions to `LINTER_MAP` (e.g., `.ts` → `["tsc", "--noEmit"]`) for additional languages. Add path prefixes to `SKIP_PREFIXES` to silence directories that intentionally don't follow the same rules. Switch from informational to blocking by changing the final `return 0` to `return 2` when issues are found — but only do this if your team's workflow expects lint to gate edits.

---

### `config-change-audit.py`

**What it does:** Audit hook (non-blocking, append-only). On every `ConfigChange` event — any change to `.claude/settings.json` (project_settings), `.claude/settings.local.json` (local_settings), `~/.claude/settings.json` (user_settings), policy_settings, or skill/agent frontmatter — appends a timestamped line to `~/.claude/config-change.log`. Log format: `timestamp | session_id (8 char) | matcher | cwd`. Never blocks. Failures silently ignored. Rotates at 5 MB (same scheme as `audit-log.py`).

Per [Claude Code security docs](https://code.claude.com/docs/en/security): *"Audit or block settings changes during sessions with ConfigChange hooks."* This hook is the AUDIT half — useful for forensic review of what a session changed about the agent's own config.

**Event:** ConfigChange, matcher: `""` (all config sources)

**Customize:** Change `log_path` to write logs elsewhere. Add fields from the `data` dict (e.g., `transcript_path`, `permission_mode`) for richer per-event detail. To convert to a BLOCKING hook (refuse any config change mid-session), change the final `sys.exit(0)` to `sys.exit(2)` — be aware this will reject every settings.json edit Claude or the user attempts, including ones the user explicitly wants. Most teams want the audit half, not the block half.

---

### `block-attribution.py`

**What it does:** Inspects the command string of any `git commit` call. If the commit message contains AI attribution strings (`Co-Authored-By: Claude`, `Generated with Claude Code`, `noreply@anthropic.com`, and similar), it blocks the commit with exit code 2.

**Event:** PreToolUse, matcher: `Bash`

**Customize:** Edit `blocked_patterns` to add or remove strings. The comparison is case-insensitive. Update the error message to reference your own policy.

---

### `branch-enforcer.py`

**What it does:** On every Bash invocation that is a `git commit`, runs `git rev-parse --abbrev-ref HEAD` and blocks (exit 2) if the current branch is in the protected list. Pairs with GitHub branch protection: this layer catches the mistake locally before it reaches the remote, so you get the error in your terminal instead of in a rejected `git push`.

**Event:** PreToolUse, matcher: `Bash`

**Customize:** Edit the `protected` list (default `["main", "master"]`). Add `"develop"`, `"production"`, or any other branch you don't want direct commits on. The `subprocess.run` call is wrapped in try/except so a git error never blocks an unrelated tool call.

---

### `push-guard.py`

**What it does:** Scans any Bash command for `git push --force`, pushes to a protected branch (`main`/`master` in any refspec form), `gh pr merge`, `gh repo edit --visibility public`, and Bash-level writes to `.env` files (including path-prefixed and `cp`/`mv`/`tee`/`install`/`dd` variants). Allows `.envrc` (direnv) and safe template suffixes (`.example`/`.sample`/`.template`).

**Event:** PreToolUse, matcher: `Bash`

**Customize:** The `blocked` list is a list of `(regex_pattern, label)` tuples. Add entries to restrict additional commands, or remove entries if you want to allow certain operations. Refspec parsing for protected-branch detection lives in `_git.py::push_targets_protected_branch` so every form (`+main`, `HEAD:main`, `refs/heads/main`, `:main`, etc.) is covered.

---

### `secret-scan.py`

**What it does:** On every Bash invocation that is a `git commit`, runs `git diff --cached --no-color -U0` and scans the added lines for high-confidence secret patterns (Shortcut, GitHub `ghp_`/`gho_`/`ghs_`/`ghu_`/`ghr_`, OpenAI legacy + project keys, Anthropic, Stripe live, Twilio, GCP service account, Slack `xox[abcdepsr]-`, AWS access key + secret, Google API, RSA private key, JWT). Blocks (exit 2) with the matched pattern name + a truncated snippet so you can find and rotate the leaked token. Stripe test keys (`sk_test_`/`pk_test_`) emit a warning but do not block.

**Event:** PreToolUse, matcher: `Bash`

**Customize:** Edit `SECRET_PATTERNS` to add or refine token regexes. Add paths to `ALLOW_PATHS` to skip files known to contain intentional token-looking strings (the hook's own tests, KB docs that describe token formats). The hook only fires on `git commit`, exits 0 when no staged diff exists, and exits 0 on invalid JSON input.

---

### `draft-before-create.py`

**What it does:** Returns a `permissionDecision: "ask"` response, which pauses execution and surfaces a permission prompt before the tool call runs. Enforces a draft-before-create policy: Claude must show the user what it intends to create, get explicit approval, and only then proceed.

**Event:** PreToolUse, matcher: your MCP tool names (e.g. `mcp__linear__save_issue|mcp__slack__send_message`)

**Customize:** The hook itself has no tool-specific logic. It always returns "ask". The real customization is in `settings.json`: set the `matcher` to exactly the MCP tool names that interact with your shared systems. Update `permissionDecisionReason` to name those tools or link to your team's policy.

---

### `file-protector.py`

**What it does:** Checks the `file_path` argument of any Edit or Write tool call against three rules: blocks `.env` files (except `.env.example`, `.env.sample`, `.env.template`), blocks private key and certificate files (`.pem`, `.key`, `.p12`, `.pfx`), and blocks a list of named credential files (`id_rsa`, `credentials.json`, `service-account.json`, etc.). Also blocks writes into `.git/` internals.

**Event:** PreToolUse, matcher: `Edit|Write`

**Customize:** Add filenames to `blocked_names` to protect additional specific files. Add extensions to `blocked_suffixes` for other key or cert formats. Remove entries that don't apply to your environment.

---

### `compact-reinject.py`

**What it does:** Emits an `additionalContext` block of critical rules just before Claude Code compacts the conversation. Claude Code merges this text into the compacted summary so important rules from CLAUDE.md aren't silently dropped when the context window collapses.

**Event:** PreCompact, matcher: `""` (all compactions)

**Customize:** Edit the `print()` block. Replace the example rules with your own most-violated instructions. Keep it to 4-6 rules: the ones you've actually had to correct Claude on. Format as a numbered list with a bold rule name and a plain-English description.

---

### `pr-template-reminder.py`

**What it does:** On every user message, checks whether the message is about creating a pull request (matched by regex patterns like "create a PR", "gh pr create", etc.) and whether the current repo has a template at `.github/pull_request_template.md`. If both are true, injects `additionalContext` instructing Claude to read and follow that template. No-ops silently otherwise.

**Event:** UserPromptSubmit, matcher: `""` (all prompts)

**Customize:** No configuration needed for standard GitHub repos. If your template is at a non-standard path, update `template_path`. Add patterns to `pr_patterns` to catch additional phrasings.

---

### `notify.py`

**What it does:** Fires when Claude Code needs user input (the Notification event). Sends a terminal bell character immediately as a universal fallback, then launches a macOS desktop notification via `osascript`. The `osascript` call is wrapped in try/except so it fails silently on non-macOS platforms — you still get the terminal bell.

**Event:** Notification, matcher: `""` (all notifications)

**Customize:** The Linux (`notify-send`) and WSL/Windows (PowerShell `NotifyIcon`) alternatives are kept in the script as commented-out blocks — uncomment the one that matches your platform and comment out the `osascript` call. The terminal bell works everywhere and requires no changes.

---

### `session-to-obsidian.py`

**What it does:** Exports the session transcript to an Obsidian vault when a session ends. Reads the session JSONL from `~/.claude/projects/`, parses it into turns, and writes a markdown note with YAML frontmatter, a conversation digest, tool usage summary, and a list of files touched. Also copies the raw JSONL to a `_raw/` archive directory. Runs async so it does not block session exit.

**Event:** Stop, matcher: `""` (all sessions)

**Customize:** Update `VAULT_ROOT` to your vault path. Update `SESSIONS_DIR` to the subdirectory where you want session notes to land. Update `PROJECT_MAP` to map your working directory keywords to vault project names for automatic wikilinks. The hook exits 0 on all errors, so failures are logged to `~/.claude/session-export.log` without affecting the session.
