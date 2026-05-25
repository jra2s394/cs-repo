# Enterprise managed-settings deployment

Example for Sysdyne IT (or any org admin) to centrally enforce policy across every contributor's Claude Code install. The example file is `managed-settings.example.json` in this directory.

## What managed settings can do that project / user settings can't

Managed settings are read **before** user and project settings and **cannot be overridden** by either. The three keys that matter most for an enterprise deployment of this repo:

| Key | What it does | Why it matters |
|---|---|---|
| `permissions.allowManagedPermissionRulesOnly: true` | User and project `allow` / `ask` / `deny` rules become no-ops. Only managed rules apply. | Survives `claude --dangerously-skip-permissions`, survives any contributor edit to `.claude/settings.json`. Makes the destructive-tool deny list (Asana delete-task, Shortcut delete-stories, etc.) unbypassable. |
| `permissions.disableBypassPermissionsMode: "disable"` | Locks out the `bypassPermissions` permission mode and the `--dangerously-skip-permissions` CLI flag. | The escape hatch is gone for everyone. Required if your security team won't sign off on a CS-data-touching tool having one. |
| `allowManagedHooksOnly: true` | Only hooks defined in managed settings (or in plugins force-enabled via managed `enabledPlugins`) load. User and project hooks are ignored. | An attacker who compromises a contributor's `~/.claude/settings.json` cannot disable the audit log, the secret scanner, or the push guard. |

## Where to put the file

Claude Code looks for managed settings at OS-specific locations (per [the Anthropic docs](https://code.claude.com/docs/en/settings#settings-files)):

| OS | Path |
|---|---|
| macOS | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Linux | `/etc/claude-code/managed-settings.json` |
| Windows | `C:\ProgramData\ClaudeCode\managed-settings.json` (or `HKLM\Software\Policies\ClaudeCode` registry) |

These paths are write-protected for non-admin users — exactly what you want.

## Deployment channels

Distribute the file via your MDM. Common patterns:

- **Jamf** (macOS) — push the JSON via a Configuration Profile or via a `cat > file` script policy
- **Intune** (Windows) — push via the Settings Catalog or a custom OMA-URI
- **Ansible / Chef / Puppet** (Linux servers / managed laptops) — drop the file via a configuration role

## Coordinating with this repo's hooks

The example file references hooks at `/opt/sysdyne/cs-repo/hooks/*.py`. That path assumes IT has cloned the repo to `/opt/sysdyne/cs-repo` on each managed machine, OR distributed the hooks separately as part of the MDM bundle. Options:

1. **MDM-bundled hooks**: copy `hooks/*.py` from this repo into the MDM payload alongside the managed-settings file. The advantage is the hooks are version-locked to whatever IT deploys.
2. **Repo-mirrored hooks**: managed settings reference `${HOME}/cs-repo/hooks/*.py` and IT requires every laptop to clone the repo to `~/cs-repo`. Simpler but each laptop is responsible for keeping the clone fresh.
3. **Cloud-fetched hooks**: have a wrapper script that downloads hooks from a private artifact store at session start. More complex but enables central hook updates without redistributing the managed-settings file.

Whichever path you pick, document it in your IT runbook so onboarding a new laptop is reproducible.

## What managed settings can't do

- Replace the per-person Intercom admin ID in `~/.claude/CLAUDE.md` (that's per-user config by design)
- Block a contributor from running `claude` in a different project directory (managed settings are global, not per-project)
- Audit MCP server traffic at the network layer (those calls go to claude.ai, then to the MCP provider — out of scope for Claude Code's local settings)

## How this layers with the existing project settings

The repo's `.claude/settings.json` already sets `permissions.disableBypassPermissionsMode: "disable"` (round-29) for the project scope. Adding the same key in managed settings is intentional belt-and-suspenders — managed wins if a contributor removes the project-level lock.

## Reviewing the example

Read [managed-settings.example.json](managed-settings.example.json) line by line before deploying. Each block has an inline `_comment_*` field documenting what it does. JSON doesn't natively support comments — `_comment` fields are ignored by Claude Code at parse time.
