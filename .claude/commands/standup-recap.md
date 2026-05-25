---
description: Aggregate the week's daily-*.md files into a recap that feeds /eow — saves regenerating Mon–Thu wins from scratch on Friday
---

Read `CLAUDE.md` from this repo before starting.

Roll up every `data/outputs/daily-*.md` file from the current work week (Mon–Fri) into a single deduplicated recap. The goal is to give `/eow` a head start so it doesn't re-pull Mon's data from Gmail/Calendar/Asana when those facts are already in the daily files.

This is a **read-only file aggregation**. No live MCP calls. No drafts. Just walk local files.

---

## Step 1 — Find the week's daily files

Compute the current work week in your local time zone (per `~/.claude/CLAUDE.md`):
- Monday of this week through Friday of this week (`<= today`)
- Glob `data/outputs/daily-YYYY-MM-DD.md` matching those dates

If today is Monday, the week has no daily files yet — say so and stop.

If today is Saturday or Sunday, treat it as the most recent week (Mon–Fri prior).

Show me which files you found:

```
Found N daily files for week of <Mon date> – <Fri date>:
  - daily-2026-05-20.md (Mon)
  - daily-2026-05-21.md (Tue)
  ...
```

---

## Step 2 — Parse each file

Each daily file has three sections under the `*Daily Update — <Weekday>, <Date>*` heading:
- `*Yesterday:*` — wins from the prior workday
- `*Today:*` — goals for that day
- `*Blockers:*` — issues flagged

Extract bullet lines from each section. Preserve indicator emoji (🔴 🟡 🟢) verbatim — they carry meaning.

---

## Step 3 — Aggregate by section

Build a single combined view:

```
## Recap — Week of <Mon date> – <Fri date>

### Wins this week (from daily files)
<every "Yesterday:" bullet from Tue–Fri files, deduplicated>
<every "Today:" bullet from Mon–Thu files that doesn't appear in a later "Yesterday:" — these are commitments that still need verification>

### Carryover candidates
<blockers that appear in 2+ daily files — likely still open>
<🔴 / 🟡 items flagged but not later marked 🟢 / resolved>

### Resolved during the week
<items that appeared as 🔴/🟡 earlier and as 🟢/done later>

### Source files
<list of daily files used, in date order>
```

---

## Step 4 — Dedup rules

- Normalize whitespace and emoji before comparing lines
- If two bullets describe the same fact (e.g., "[Teammate] Day 1 agenda sent" and "Sent [Teammate] Day 1 agenda"), keep the earliest mention
- A "Today" bullet that later appears as a "Yesterday" bullet means the work was attempted — keep the "Yesterday" version (it's the more authoritative status)
- A "Today" bullet with no matching "Yesterday" follow-up is unverified — flag it 🟡 and call it out

---

## Step 5 — Output

Save the recap to `data/outputs/recap-<Friday date>.md`.

Show it inline, then say:

> "Recap saved. Run `/eow` next — it can incorporate this file as its primary win source instead of re-pulling the week from scratch."

---

## Rules

- **No MCP calls** — this command only reads local files. The whole point is to *avoid* re-pulling data the daily files already captured.
- If a daily file is missing for a day, say so explicitly — don't infer or fill in.
- Never modify the source daily files. Recap is a derivative artifact.
- All dates in your local time zone (per `~/.claude/CLAUDE.md`).
- If `data/outputs/` doesn't exist or has zero daily-*.md files for this week, say so and stop.
