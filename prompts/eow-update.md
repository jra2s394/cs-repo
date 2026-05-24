# End of Week (EOW) Slack Update — Prompt

Generate the Friday end-of-week post for Slabstack in your house format.

---

## Scope

- **Period covered:** Mon-Fri full week recap + next week preview
- **Use:** Friday end of day (or Thu PM)

---

## Data to pull (do these BEFORE writing anything)

1. **Calendar — full week (Mon-Fri):**
   ISO 8601 bounds for the full week MT

2. **Calendar — next week (Mon-Fri):**
   For "Goals for next week" section

3. **Read.ai meeting reports — via Gmail (no MCP connection):**
   Read.ai has no MCP server, but it emails a meeting report to Gmail after each
   recorded meeting. Search Gmail `from:e.read.ai` for the full week (Mon-Fri). Each
   report email contains a meeting summary, an action-items list, and per-chapter
   topics — use these as the transcript source. Attribute outcomes as "per Read.ai
   meeting report (email)", authoritative over inferred wins for the weekly rollup.
   Compile all action items across the week — these become carryover if not resolved.

4. **Gmail — since Monday:**
   `search_threads` with `after:<Mon YYYY/MM/DD> -in:draft -category:promotions -category:social`
   Pull 30-50 threads.

5. **Gmail — targeted searches for any uncertain items:**
   If Heritage go-live status unclear: `(Heritage OR Lou OR sundry) after:<Mon>`
   If an integration milestone unclear: search the customer name
   **This is REQUIRED before claiming any milestone happened.**

6. **Asana — my tasks updated this week**

7. **Intercom — my conversations updated this week**

8. **Last week's update if available** in `data/outputs/` — for carryover accuracy

---

## Output format

```
How are you feeling? (1-10) 🧘
[I'll fill in]

@your-slack-handle is excited about:
- [3 biggest wins of the week — prefer transcript-confirmed outcomes]

🎉 :slab: :party_gopher:

---

**Yesterday's Wins (Thu M/D):** ✅
[6-10 bullets — use Read.ai transcript outcomes where available]

**This Week's WINS (Mon-Wed only — Thu is in Yesterday's Wins above):** ✅
[Aggregated Mon-Wed wins, organized by customer/project — do NOT duplicate Thursday here]
✅ **Customer Name** — [what happened, who was involved, outcome from transcript or email]
[10-20 bullets typical]

---

**Today's Goals (Fri M/D):** 🎯
- [HH:MM]am — [Meeting]
[All Fri calendar events]

---

**Action Items — Open Heading into Next Week:** 📋
- [Owner] → [Action item] — [Customer/Meeting] | due [date or ASAP]
[Aggregate all open action items from Read.ai transcripts across the full week.
These feed directly into next week's carryover. Only from transcripts — do not invent.]

---

**Roadblocks-Concerns-Hurdles — Lessons Learned:** 🚧 ⚠️
- 🔴 [Critical blockers — including risks surfaced in transcripts]
- 🟡 [Watch items]
- 🟢 [Resolved]

**Lessons Learned:**
- [1-3 takeaways from the week — can pull from transcript themes]

---

**Carryover for next week:** 📋
- [What's not done that rolls forward — include open action items from Read.ai]

**Goals for NEXT WEEK (M/D - M/D):**
- **Mon M/D:** [Key meetings/milestones from next week's calendar]
- **Tue M/D:** [...]
- [Through Friday]

**Major Milestones:**
- [Go-lives, customer milestones, hires]

**Onboarding Momentum:**
- [Active onboarding projects]

---

**Follow-up Drafts** ✉️
*(One per customer meeting with a Read.ai transcript this week. Review before sending.
Prioritize any meeting where action items are still open.)*

**[Customer Name]**
To: [attendee emails from calendar]
Subject: [Meeting name] — [brief outcome or next step]

[2-4 sentence recap pulled from Read.ai summary. Do not invent content.]

[Repeat for each meeting with a transcript]
```

End with: "Want me to drop this in Slack as a draft, or tweak anything?"

---

## CRITICAL accuracy check before posting

Before finalizing, **re-verify every "this week's wins" item** against the data:
- Does a Read.ai transcript or calendar event confirm the meeting happened?
- Does a sent email confirm the deliverable was sent?
- If you can't confirm — move it to 🔴 "status unclear" under Roadblocks.

Specifically watch for: claimed go-lives, claimed integrations, claimed customer
approvals. These are the easiest to hallucinate. If there's no transcript or inbox
evidence, flag it.

---

## Save the output

`data/outputs/eow-YYYY-MM-DD.md`
