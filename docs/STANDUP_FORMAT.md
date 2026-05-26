# Standup House Format

Format rules for standup posts (`/daily`, `/midweek`, `/eow`, `/weekstart`).
Lives in `docs/` rather than CLAUDE.md so it loads only when one of the
standup commands actually runs (per the round-65 CLAUDE.md slim).

Each standup command's prompt file in `prompts/*.md` references this doc
for the exact output shape.

---

Two formats, by update type.

## Daily

Terse; posts straight to Slack. No opener. Title line, then three sections:

```
*Daily Update — [Weekday], [Month Day]*

*Yesterday:*
• [...]

*Today:*
• [...]

*Blockers:*
• [...]
```

## Midweek / EOW / Week Start

The fuller house format; starts with:

```
How are you feeling? (1-10) 🧘
[I'll fill in]

@your-slack-handle is excited about:
- [2-3 highlights from this period]

🎉 :slab: :party_gopher:
```

Then the period-specific body (see `prompts/*.md`).

## Closing line (all formats)

End the message to me with —

> "Want me to drop this in Slack as a draft, or tweak anything?"
