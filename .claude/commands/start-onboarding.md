---
description: Kick off a new customer onboarding — Asana project, Drive folder, Shortcut CSEng story, Slack channel
---

# Start Onboarding

Set up all onboarding infrastructure for a new customer in one command. Touches four systems — draft everything first, get approval, then execute in order.

**Safety:** The `draft-before-create.py` hook is active and will prompt before every write operation. This command also enforces its own draft-first review step.

---

## Steps

### 1. Collect customer info

Ask for (or confirm from context):

| Field | Example |
|---|---|
| Customer name | Acme Materials |
| Customer slug (short, no spaces) | Acme |
| CARR | $48,000 |
| CSM owner | [Your Name] |
| Target go-live date | August 1, 2026 |
| Key contacts (name, role, email, phone) | [Contact Name] — VP Ops — contact@acme.com — 555-1234 |
| Brief project description (1–2 sentences) | Initial onboarding including dispatch integration and mix design import. Standard timeline. |

---

### 2. Draft everything for review

Present all four items in a single block before taking any action. Wait for explicit approval ("looks good", "go ahead", "create it") before continuing.

---

**Asana Project**
- Name: `{Customer Name} Onboarding`
- Template: `Onboarding - SlabstackCustomer`
- Portfolio: `Slabstack Onboarding`

**Google Drive Folder**
- Folder name: `{Customer Name}`
- Location: Customer Success / Onboarding
  (`[DRIVE_PARENT_FOLDER_URL]` — set this in your private CLAUDE.md)

**Shortcut CSEng Story**
- Title: `CSEng: {Customer Name} Onboarding Setup`
- Type: Feature
- Description: {brief project description — include integration type, known complexity, CARR}
- Label: `cs-eng-support`

**Slack Channel**
- Name: `onboarding-{slug}` (lowercase, hyphens only)
- You will create this manually — instructions in step 3d below.

---

### 3. Execute on approval (in this order)

#### a. Create Asana project from template

1. Call `mcp__claude_ai_Asana__get_portfolios` — find 'Slabstack Onboarding', note its GID.
2. Call `mcp__claude_ai_Asana__search_objects` with name `Onboarding - SlabstackCustomer` and type `project_template` — note the template GID.
3. Call `mcp__claude_ai_Asana__create_project_preview_v3` (or `create_project_preview`) with:
   - `name`: `{Customer Name} Onboarding`
   - `template_gid`: (from step 2)
   - `portfolio_gid`: (from step 1, if the tool accepts it)
4. Call `mcp__claude_ai_Asana__create_project_confirm` to finalize.
5. Note the new project URL.

**If template lookup fails:** Create the project with `create_project_preview` using just the name and portfolio, then tell the user: "Template could not be applied automatically — please clone sections from 'Onboarding - SlabstackCustomer' manually."

#### b. Create Google Drive folder

Call `mcp__claude_ai_Google_Drive__create_file` with:
- `title`: `{Customer Name}`
- `mimeType`: `application/vnd.google-apps.folder`
- `parentFolderId`: `[DRIVE_PARENT_FOLDER_ID]` (from your private CLAUDE.md)

Note the new folder URL.

**If Drive MCP does not support folder creation** (returns an error or unsupported operation): Tell the user: "Drive folder creation is not supported by the current MCP — please create the folder manually in your configured parent folder (`[DRIVE_PARENT_FOLDER_URL]`) — name it `{Customer Name}`."

#### c. Create Shortcut CSEng story

Call `mcp__shortcut__stories-create` with:
- `name`: `CSEng: {Customer Name} Onboarding Setup`
- `story_type`: `feature`
- `description`: (full description including customer name, CARR, integration type, go-live target, and any known technical complexity)
- `labels`: [`cs-eng-support`]

Note the story URL and ID (e.g. `SC-1234`).

#### d. Slack channel — manual creation

Tell the user:

> **Action required — create the Slack channel:**
> 1. In Slack, click **+** next to Channels → **Create a channel**
> 2. Name it exactly: `onboarding-{slug}` (lowercase, hyphens only)
> 3. Set visibility to Private (or Public — your preference)
> 4. Invite yourself, the assigned CSM, and any CSEng team members
> 5. Reply here once the channel is created and I'll post the resource links.

**Wait** for the user to confirm the channel exists before proceeding to step e.

#### e. Post resource links to the new Slack channel

Once the user confirms the channel exists, call `mcp__claude_ai_Slack__slack_send_message` to post to `#onboarding-{slug}`:

```
👋 *{Customer Name} Onboarding — Resources*

Here are the links for this engagement:

• *Asana Project:* {asana-project-url}
• *Google Drive:* {drive-folder-url}
• *Shortcut Story:* {shortcut-story-url}

*CSM:* {CSM name}
*CARR:* {CARR}
*Go-Live Target:* {target go-live date}

_Use this channel for all onboarding coordination. Tag @here for urgent blockers._
```

---

## End with

Summary of what was created:

```
✓ Asana project: {Customer Name} Onboarding — {asana-url}
✓ Google Drive folder: {Customer Name} — {drive-url}
✓ Shortcut story: SC-{ID} — {shortcut-url}
✓ Slack channel: #onboarding-{slug} — links posted
```

"All onboarding infrastructure is set up for {Customer Name}. Run `/onboarding-status-report` at any time to generate a customer-facing progress report."

---

## Rules

- **Always draft all four items and get explicit approval before creating anything.**
- Never create the Asana project, Drive folder, or Shortcut story without user approval.
- Never post to Slack without first confirming the channel exists.
- If any step fails, report the failure clearly, note any manual action required, and continue with the remaining steps.
- CARR goes in the Shortcut story description — it helps CSEng scope the work.
- All content follows the draft-before-create pattern enforced by `draft-before-create.py`.
