---
description: Validate everything is configured correctly — personal CLAUDE.md filled in, all 7 MCPs reachable, output dirs present. Run after /setup to confirm you're ready. Read-only — no fixes attempted.
---

Run a battery of read-only checks and produce a green/yellow/red report on whether this teammate's setup is actually ready to use the tool. Run this after `/setup` and any time something feels off ("why did `/daily` return the wrong person's data?").

**Read-only.** This command never modifies files, never writes config, never creates anything. It only checks state and reports.

---

## Step 1 — Check the personal CLAUDE.md

The personal CLAUDE.md at `~/.claude/CLAUDE.md` is the per-teammate config. The project `CLAUDE.md` is shared (don't modify it from `/check-setup`).

Look for:
- [ ] File exists at `~/.claude/CLAUDE.md`
- [ ] Contains a real name (not the placeholder `Your Full Name` / `[Your Name]`)
- [ ] Contains a real email (not `your@company.com`)
- [ ] Contains a real Intercom Admin ID (not `paste-your-number-from-step-3-here` or `YOUR_INTERCOM_ID` — should be a string of digits)
- [ ] Contains a `Time zone:` line with a valid IANA name (e.g. `America/Denver`, `Europe/London`). Validate by running `python3 -c "from zoneinfo import ZoneInfo; ZoneInfo('<value>')"` — exit 0 = valid, any error = invalid. Reject display-name forms like "Mountain Time" or "PST" since per-command code uses `ZoneInfo()` directly.
- [ ] Contains an `Asana Team GID:` line. **Optional** — value can be a digit string (set), `[unset]` (deliberately skipped during `/setup`), or `ASANA_TEAM_GID` (placeholder never filled in). Report 🟢 if set, 🟡 if `[unset]` or `ASANA_TEAM_GID`, never 🔴 — commands fall back to workspace-wide queries if missing.

Report:
- 🟢 if all required fields are real values AND the IANA TZ parses cleanly (Asana Team GID may be 🟡 without dropping the overall score)
- 🟡 if any required field is still placeholder, OR the `Time zone:` line is missing, OR Asana Team GID is unset (fixable by re-running `/setup`)
- 🔴 if the file is missing entirely, OR the `Time zone:` value is set but doesn't parse as a valid IANA name (will silently break every command that derives "now in user-local time")

---

## Step 2 — Check MCP connectivity

For each of the 7 MCPs, attempt one read-only no-op call. Catch any error per MCP — don't let one bad MCP abort the whole check.

| MCP | Probe call |
|---|---|
| Gmail | `list_labels` (no args) |
| Google Calendar | `list_calendars` (no args) |
| Google Drive | `list_recent_files` (small page size) |
| Asana | `get_me` (no args) |
| Intercom | `list_companies` with a small `per_page` (e.g. 1) — the MCP does not expose a `search_companies` or `get_me`; this is the simplest read-only probe |
| Slack | `slack_search_channels` with a generic query |
| Shortcut | `users-get-current` (no args) |

For each:
- 🟢 call succeeded → confirm the returned identity (e.g., Gmail: "responding as <your-email>"; Asana: "responding as <your-name>"; Shortcut: "responding as <username>")
- 🔴 call errored → report the error message verbatim and link to the fix (claude.ai → Settings → Integrations → reconnect)

If the Gmail/Calendar/Drive trio fails together, suggest reconnecting any one — they share a single Google login.

---

## Step 3 — Cross-check Intercom ID

Critical sanity check: the Intercom Admin ID in `~/.claude/CLAUDE.md` should match the authenticated Intercom session. If they don't match, `/daily` will return someone else's conversations and nobody will notice for days.

Compare:
- ID in CLAUDE.md
- ID of the currently authenticated Intercom admin. The Intercom MCP does not expose `get_me`; derive the admin ID by fetching a recent conversation via `search_conversations` (or `list_articles`) and reading the `author.id` / `assignee.id` of an item the user themselves authored or owns. If no such item is found, report 🟡 with "manual verification needed".

Report:
- 🟢 match
- 🔴 mismatch — show both IDs and tell the user to re-do Step 3 of SETUP.md

If you can't fetch the current admin (e.g., the API doesn't expose it), report 🟡 with "manual verification needed — log in to Intercom and confirm the ID matches".

---

## Step 4 — Check filesystem

Verify the directories the tool writes to exist (or can be created):
- [ ] `data/outputs/` — for standup `.md` files
- [ ] `out/` — for report `.docx` and `.csv` files
- [ ] `~/Desktop/CS Reports/` — only if Step 5 of SETUP.md was run; if missing, report 🟡 ("optional — run scripts/setup-desktop.sh to enable Desktop copies")

For each, report 🟢 if present, 🔴 if missing (auto-creation is the user's choice — don't create from this command).

---

## Step 5 — Check dev dependencies (only if user wants to run tests)

If `make test` or `make lint` would be useful (i.e., the teammate plans to modify code), verify:
- [ ] `node_modules/` exists at repo root (means `npm install` was run)
- [ ] `python3 -c "import pytest"` succeeds (means `pip3 install -r requirements-dev.txt` was run)
- [ ] `python3 -c "import ruff"` succeeds (only for linting)
- [ ] `npx --no-install biome --version` succeeds (only for linting)

These are 🟡 (not 🔴) if missing — a teammate who only uses commands doesn't need them. Note in the report: "only needed if you plan to modify code or run `/review-code`".

---

## Step 6 — Present the report

```
## Setup Check — <Today's Date>

### Personal config (~/.claude/CLAUDE.md)
- 🟢 / 🟡 / 🔴 <status>
  - Name: <real / placeholder>
  - Email: <real / placeholder>
  - Intercom Admin ID: <real / placeholder / cross-check status>
  - Time zone: <IANA name parses / missing / invalid>
  - Asana Team GID: <set / unset (optional — see SETUP.md Step 4)>

### MCP integrations (7)
- 🟢 Gmail — responding as <your-email>
- 🟢 Google Calendar — N calendars accessible
- 🟢 Google Drive — recent files retrievable
- 🟢 Asana — responding as <your-name>
- 🟢 Intercom — admin ID matches CLAUDE.md
- 🟢 Slack — N channels accessible
- 🟢 Shortcut — responding as <username>

### Filesystem
- 🟢 data/outputs/ present
- 🟢 out/ present
- 🟢 / 🟡 ~/Desktop/CS Reports/ present  (or "not set up — optional")

### Dev tools (only if modifying code)
- 🟢 / 🟡 node_modules/ (npm install)
- 🟢 / 🟡 pytest (pip3 install -r requirements-dev.txt)
- 🟢 / 🟡 ruff
- 🟢 / 🟡 biome

---

**Overall:** 🟢 ready to go  |  🟡 some optional items missing  |  🔴 X blockers — fix before using

**Next steps if anything failed:**
- Personal CLAUDE.md issues → re-run `/setup`
- MCP failures → claude.ai → Settings → Integrations → reconnect the named MCP
- Intercom ID mismatch → re-do Step 3 of SETUP.md and update CLAUDE.md
- Filesystem missing → cd cs-repo  &&  bash scripts/setup-desktop.sh
- Dev tool issues → make install-dev  &&  npm install
```

---

## Rules

- **Read-only.** Never fix, never write, never reconnect, never modify CLAUDE.md or any other file.
- **Per-MCP error isolation.** One bad MCP must not abort the others. Always run all 7 probes.
- **Surface the Intercom mismatch loudly.** A silent ID mismatch is the highest-impact failure mode this command exists to catch — make it impossible to miss in the output.
- **Don't claim 🟢 without evidence.** If an MCP probe returns an unexpected shape, report 🟡 ("probe succeeded but identity unclear") rather than 🟢.
- **Always end with the "Next steps" block.** Even if everything is 🟢 — surface the empty list so the user knows the check ran to completion.
