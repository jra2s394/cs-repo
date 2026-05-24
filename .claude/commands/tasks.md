---
description: Show my open Asana tasks and help me manage them — add, update, or close tasks with approval
---

Read `CLAUDE.md` from this repo before starting.

Pull my current Asana task list and give me a clean view of what's on my plate.

**Scope:** This command reads and surfaces tasks. Completing, closing, or changing task status happens in Asana — not here. Claude will tell you exactly what to do and give you the link.

---

## Step 1 — Pull my tasks

Use `get_my_tasks` to fetch all tasks assigned to me that are incomplete. Include due dates and project names.

---

## Step 2 — Organize and display

Group tasks by urgency:

1. **Due today or overdue** — flagged 🔴
2. **Due this week** — flagged 🟡
3. **No due date / later** — flagged 🟢

For each task show: task name, project, due date, Asana URL if available.

---

## Step 3 — Surface suggestions and offer to add

After the list, offer one thing:

> "Want to add a new task? I can also tell you which ones look ready to close based on what I see."

**If adding a task:**
- Ask for: name, project, due date, any notes
- Draft it in the conversation for review
- Wait for explicit approval before creating in Asana via `create_tasks`

**If the user asks what to complete or update:**
- Identify the task(s) by name
- Tell them exactly what action to take: "Mark '[Task Name]' complete in Asana — [link if available]"
- Do not call `update_tasks` for completion or status changes

**If the user asks to update a task (due date, notes, assignee):**
- Draft the update in conversation
- Wait for explicit "yes, update it" before calling `update_tasks`
- Never use `update_tasks` to change completion status or workflow state

---

## Rules

- Never mark a task complete or change its status via API — tell the user to do it in Asana
- Only call `update_tasks` for non-completion changes (due date, notes, assignee) and only after explicit approval
- Never create a task without approval
- If any MCP tool is unavailable, say which one and stop
