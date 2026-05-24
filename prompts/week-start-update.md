# Week Start Slack Update — Prompt

Generate the Monday morning post for Slabstack in your house format.

---

## Scope

- **Period covered:** Last week's carryover + this week's goals
- **Use:** Monday mornings

---

## Data to pull (do these BEFORE writing anything)

1. **Last Friday's EOW update** from `data/outputs/eow-*.md` (most recent).
   This is the source of truth for what carried over — including any open action items
   that were captured from Read.ai transcripts in that EOW.

2. **Calendar — this week (Mon-Fri):**
   ISO 8601 bounds for the full week MT

3. **Read.ai meeting reports — via Gmail (no MCP connection):**
   Read.ai has no MCP server, but it emails a meeting report to Gmail after each
   recorded meeting. Search Gmail `from:e.read.ai` for Friday and the weekend to catch
   late meetings that may have generated action items not yet in the EOW. If found,
   add those action items to the carryover list.

4. **Gmail — since last Friday:**
   `search_threads` with `after:<last Fri YYYY/MM/DD> -in:draft -category:promotions -category:social`
   Captures weekend activity + late Friday + early Monday

5. **Asana — my tasks updated since Friday**

6. **Intercom — my conversations updated since Friday**

---

## Output format

```
How are you feeling? (1-10) 🧘
[I'll fill in]

@your-slack-handle is excited about:
- [Top thing this week — biggest milestone or meeting]
- [Highlight 2]
- [Highlight 3]

🎉 :slab: :party_gopher:

---

**Last Week Carryover:** 📋
✅ [Item from last Friday's EOW carryover or open action items] — [current status]
✅ [Item] — [status]
[8-15 bullets — pulled FROM last Friday's EOW carryover + open Read.ai action items]

---

**Today's Goals (Mon M/D):** 🎯
- [HH:MM]am — [Meeting] (attendees)
[All Mon calendar events]

**This Week's Goals (M/D - M/D):** 🎯

**Tue M/D:** [3-5 key meetings/milestones]
**Wed M/D:** [3-5 key meetings/milestones]
**Thu M/D:** [3-5 key meetings/milestones]
**Fri M/D:** [3-5 key meetings/milestones + go-live targets]

**Major Milestones:**
- 🎯 [Go-live target with date]
- 🎯 [Integration milestone with date]

**Onboarding Momentum:**
- [Active onboarding projects + this week's touchpoints]

---

**Roadblocks-Concerns-Hurdles:** 🚧 ⚠️
- 🔴 [Critical — anything carried over that's blocking, including open action items from last week]
- 🟡 [Watch items]
- 🟢 [Resolved over weekend]
```

End with: "Want me to drop this in Slack as a draft, or tweak anything?"

---

## Carryover accuracy

The biggest failure mode here is **inventing carryover items**. Use these rules:

1. **Read last Friday's EOW file first.** Carryover items must appear in last Friday's
   "Goals for next week," "Carryover," or "Action Items — Open" sections.
2. **Read.ai action items from last week's EOW are first-class carryover** — if an
   action item was open at EOW, it carries forward until closed.
3. **Mark anything OOO from team members** — check for OOO emails over the weekend and note any active OOOs in the carryover section.
4. **If last Friday's update isn't in `data/outputs/`**, tell me — I'll point you
   to it or paste it in.

---

## Save the output

`data/outputs/week-start-YYYY-MM-DD.md`
