# Personal CLAUDE.md Template

Sections to fill in when you fork this repo. Copy these blocks into your
personal `~/.claude/CLAUDE.md` (the per-user file Claude Code reads
alongside the repo-shared `CLAUDE.md`), replacing the placeholders with
your own values.

Lives in `docs/templates/` rather than the repo-shared `CLAUDE.md`
itself so the project CLAUDE.md stays focused on behavioral rules.
SETUP.md is the authoritative how-to for filling these out the first
time; this file is the shape reference.

---

## Identity

```
[Your Name] — [Your Title] at [Your Company].
[Your time zone — IANA name, e.g. `America/Denver`]. Based in [Your Location].
Email: [your-email@company.com]
```

---

## Intercom admin IDs

Used when filtering conversations to a specific teammate (see
`/check-setup` for the cross-check that validates the ID matches your
authenticated Intercom session).

| Name | ID |
|---|---|
| [Your Name] | `YOUR_INTERCOM_ID` |
| [Teammate 1] | `TEAMMATE_1_ID` |
| [Teammate 2] | `TEAMMATE_2_ID` |
| [Teammate 3] | `TEAMMATE_3_ID` |

---

## Asana Team GID

Commands like `/health-score`, `/my-tasks`, and `/at-risk` filter Asana
queries to your team's projects (so sibling-team projects don't pollute
results). Set this once.

To find it: open any of your customer projects in Asana, copy the team
segment from the URL (the long number between `/teams/` and the next
`/`).

```
Asana Team GID: ASANA_TEAM_GID
```

If unset, commands fall back to workspace-wide queries — usually slower
and noisier. `/check-setup` flags an unset value as 🟡 (optional but
recommended).

---

## Key People

```
**Leadership / managers:**
- [Manager Name] — my manager
- [Peer 1] — peer
- [Peer 2] — peer
- [Ops/HR contact] — Ops/HR

**My team (CS):**
- [CSM 1] — CSM
- [CSM 2] — CSM
- [CS Engineer 1] — CS engineer
- [CS Engineer 2] — CS engineering (integrations)
- [CS Engineer 3] — CS engineering (integrations)
- [Reporting contact] — reporting/dashboards

**Sales / AEs:**
- [AE Name] — AE

**Product / engineering:**
- [Product lead] — product/engineering lead
- [Eng contact] — engineering
```

---

## Recurring Customers / Projects

Format: Company Name (Contact 1, Contact 2), ...

```
Acme Concrete ([CONTACT_F], Bob Jones), Regional Ready Mix (Tom Brown), ...
```

Helps Claude recognize customer names in inbox triage, meeting prep,
follow-up emails, etc. Add accounts you touch regularly; you can grow
this over time.
