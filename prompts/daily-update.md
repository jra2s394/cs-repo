# Daily Slack Update — Prompt

Generate today's daily standup post for Slabstack in your house format.

---

## Scope

- **Period covered:** yesterday (work day) + today
- **Use:** Tue/Wed/Thu/Fri mornings or end-of-day
- **For Monday, use `week-start-update.md` instead.**

---

## Data to pull (do these BEFORE writing anything)

1. **Calendar — today:**
   `list_events` with `startTime: <today 00:00:00 MT>` and `endTime: <today 23:59:59 MT>`

2. **Calendar — yesterday (for "Yesterday's Wins"):**
   `list_events` with yesterday's full-day ISO bounds

3. **Read.ai meeting reports — via Gmail (no MCP connection):**
   Read.ai has no MCP server, but it emails a meeting report to Gmail after each
   recorded meeting. Search Gmail `from:e.read.ai` for yesterday's date range. Each
   report email contains a meeting summary, an action-items list, and per-chapter
   topics — use these as the transcript source. Internal 1:1s may not be recorded —
   that's expected; fall back to calendar + email. Attribute outcomes as "per Read.ai
   meeting report (email)", and treat them as authoritative over inferred wins.

4. **Gmail — last 24h:**
   `search_threads` with `after:<yesterday YYYY/MM/DD> -in:draft -category:promotions -category:social`
   Pull at least 30 threads.

5. **Asana — my tasks updated yesterday/today:**
   Filter to assignee=me, updated within last 48h

6. **Intercom — my conversations updated last 24h:**
   Filter to my conversations only

If a tool fails or returns empty, note it and continue. Do not invent data.

---

## Output format

```
*Daily Update — [Weekday], [Month Day]*

*Yesterday:*
• [Meeting/call — outcome from Read.ai report email if available, else email/calendar]
• [Email sent / customer reply received]
• [Asana task completed]
[Consolidate related items onto one bullet — keep it tight, ~5-8 bullets total]

*Today:*
• [Key meeting — outcome or next step]
• [Support tickets closed — give a count]
• [Action item from a Read.ai report — owner → task; fold action items in here]
[~5-8 bullets]

*Blockers:*
• [Critical blockers first — open threads, escalations, looming deadlines, customer-blocking bugs]
• [Watch items — in flight, not resolved]
[~3-6 bullets, most urgent first]
```

End the message with: "Want me to drop this in Slack as a draft, or tweak anything?"

---

## Rules (from CLAUDE.md, repeated for emphasis)

- Keep it terse — this posts straight to Slack. No "How are you feeling", no @your-slack-handle section.
- Section headers are italic (`*Yesterday:*`); bullets use `•`; times in your local time zone (the IANA name set in `~/.claude/CLAUDE.md`).
- No win goes in without a calendar event, sent email, Asana completion, or Intercom close
- Read.ai report outcomes replace inferred wins — don't duplicate both
- Action items come from Read.ai reports — fold them into *Today*; don't invent them
- A follow-up email recap can be offered separately (not in the posted standup) when a Read.ai report exists
- Flag unclear status as 🔴 — don't paper over
- Don't invent counts or numbers
- Quote senders/recipients accurately when summarizing email threads

---

## Save the output

After generating, save to `data/outputs/daily-YYYY-MM-DD.md`.
