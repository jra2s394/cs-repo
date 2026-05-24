# Midweek Slack Update — Prompt

Generate the Wednesday midweek standup post for Slabstack in your house format.

---

## Scope

- **Period covered:** Mon-Tue wins + Wed/Thu/Fri goals
- **Use:** Wednesday mornings

---

## Data to pull (do these BEFORE writing anything)

1. **Calendar — Monday through Friday this week:**
   `list_events` with Mon 00:00 → Fri 23:59 MT bounds

2. **Read.ai meeting reports — via Gmail (no MCP connection):**
   Read.ai has no MCP server, but it emails a meeting report to Gmail after each
   recorded meeting. Search Gmail `from:e.read.ai` for Monday through yesterday
   (Tuesday). Each report email contains a meeting summary, an action-items list, and
   per-chapter topics — use these as the transcript source. Attribute outcomes as "per
   Read.ai meeting report (email)", and treat them as authoritative over inferred wins.

3. **Gmail — since Monday:**
   `search_threads` with `after:<Monday YYYY/MM/DD> -in:draft -category:promotions -category:social`
   Pull 30-50 threads.

4. **Asana — my tasks updated since Monday**

5. **Intercom — my conversations updated since Monday**

If a tool fails or returns empty, note it. Do not invent data.

---

## Output format

```
How are you feeling? (1-10) 🧘
[I'll fill in]

@your-slack-handle is excited about:
- [Big win from Mon/Tue OR big meeting Wed/Thu]
- [Big win 2]
- [Big win 3]

🎉 :slab: :party_gopher:

---

**Mon-Tue Wins (M/D - M/D):** ✅
✅ [Meeting] — [outcome from Read.ai transcript if available, otherwise email/calendar]
✅ [Customer email/reply]
✅ [Task done]
[10-15 bullets typical]

---

**Today's Goals (Wed M/D):** 🎯
- [HH:MM]am — [Meeting] (attendees)
[All Wed calendar events]

**Rest of Week:** 🎯
- **Thu M/D:** [3-5 bullets of key Thu meetings]
- **Fri M/D:** [3-5 bullets of key Fri meetings + milestones]

---

**Action Items from Mon-Tue Meetings:** 📋
- [Owner] → [Action item from Read.ai transcript] — [Meeting name] | due [date or ASAP]
[Only from Read.ai transcripts. Omit section if no transcripts found.]

---

**Roadblocks-Concerns-Hurdles:** 🚧 ⚠️
- 🔴 [Critical — including risks flagged in Read.ai transcripts]
- 🟡 [Watch]
- 🟢 [Resolved]

---

**Follow-up Drafts** ✉️
*(One per Mon-Tue customer meeting with a Read.ai transcript. Review before sending.)*

**[Customer Name]**
To: [attendee emails from calendar]
Subject: [Meeting name] — [brief outcome or next step]

[2-4 sentence recap pulled from Read.ai summary. Do not invent content.]

[Repeat for each meeting with a transcript]
```

End with: "Want me to drop this in Slack as a draft, or tweak anything?"

---

## Save the output

`data/outputs/midweek-YYYY-MM-DD.md`
