# At-Risk Triage — Prompt Template

Use this template when running `/at-risk`. Claude uses this to systematically search for risk signals and triage them by severity.

---

## Search Queries

### Intercom
- `created_at >= [7 days ago]` + filter by `open` + `no response`
- Search for angry sentiment or escalation tags
- Note: Use admin ID filter to scope to your accounts

### Gmail
- `from:[customer-domain] -in:sent newer_than:5d` — customer emails awaiting reply
- `subject:("urgent" OR "issue" OR "not working") newer_than:14d`
- `("frustrated" OR "unhappy" OR "cancel") -in:sent newer_than:30d`

### Asana
- Pull all tasks across CS projects, filter: `due_on < [today]` + `completed = false`
- Flag any task with "blocker" or "critical" in the title

### Shortcut
- `state:"Blocked"` across CSEng team
- `updated_at < [14 days ago]` + `state not in ["Done", "Archived"]`
- Filter by customer name labels

### Google Calendar
- List events for past 30 days — identify customer domains with zero meetings
- Check for cancelled events that weren't rebooked

## Risk Triage Thresholds

| Signal | 🟡 Watch | 🔴 Immediate |
|---|---|---|
| Intercom no-reply | 24–72h | 72h+ |
| Email no-reply | 3–5 days | 5+ days |
| Asana overdue | 1–7 days | 7+ days |
| Shortcut blocked | 7–14 days | 14+ days |
| Dark account (no contact) | 14–30 days | 30+ days |

## Output Rules

- Every 🔴 item gets: customer name, specific issue, age, and a named recommended action
- Cross-system signals (same customer in multiple systems) = automatic 🔴
- Internal tasks (no customer domain) are not risk items — skip them
- Never invent risk items — only surface what the tools return
- If a tool is unavailable, say so and skip that signal type

## Recommended Actions — Language Guide

Use specific, actionable language:
- "Send a check-in email to [Contact] — I can draft one if you'd like."
- "Create an Asana task to unblock [item] — I can draft the task for your approval."
- "Add a comment to SC-[id] noting [context] — I can draft it."

Never say: "Follow up" / "Address this" / "Look into it" — always say what to do and offer to help draft it.
