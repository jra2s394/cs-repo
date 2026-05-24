---
description: Show my open Asana tasks and help me manage them — add, update, or close tasks with approval
---

Read `CLAUDE.md` from this repo before starting.

Pull my current Asana task list and give me a clean view of what's on my plate.

---

## Step 1 — Pull my tasks

Use `get_my_tasks` to fetch all tasks assigned to me that are incomplete. Include due dates and project names.

---

## Step 2 — Organize and display

Group tasks by:

1. **Due today or overdue** — show these first, flagged 🔴
2. **Due this week** — flagged 🟡
3. **No due date / later** — flagged 🟢

For each task show: task name, project, due date, and any notes.

---

## Step 3 — Ask what I want to do

After showing the list, ask:

> "Want to add a task, update one, mark something complete, or just review?"

**If adding a task:**
- Ask for: name, project, due date, any notes
- Draft it in the conversation for my review
- Wait for approval before creating in Asana

**If updating a task:**
- Ask which task and what to change
- Draft the update for my review
- Wait for approval before saving

**If marking complete:**
- Confirm which task(s) to close
- Wait for explicit "yes, close it" before marking done

---

## Rules

- Never create, update, or close a task in Asana without explicit approval
- Always draft changes in conversation first
- If any MCP tool is unavailable, tell me which one and stop
