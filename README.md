# CS Ops — AI Assistant for the Slabstack CS Team

You type a command. Claude reads your real data, writes the output, and shows it to you before doing anything. Nothing gets posted or sent without your OK.

---

**New here?** → [SETUP.md](SETUP.md) — takes about 10 minutes

**Already set up?** → [USER_GUIDE.md](USER_GUIDE.md) — every command explained

---

## What it does

**Standup updates** — pulls your emails, calendar, Asana, and Intercom, then writes your standup in the team format. You review it and decide whether to post.

**Intercom reports** — conversation counts, response times, and customer breakdowns in a Word doc. Five time ranges: daily through year-to-date.

**Onboarding reports** — reads the Finance Pending Transactions sheet, cross-checks with Asana, and shows which accounts are on track, at risk, or done.

**Renewal invoice reports** — reads the Finance renewals sheet and calculates exactly what each customer owes. Handles volume and fixed-rate contracts automatically.

**Portfolio intelligence** — `/health-score` for a green/yellow/red view of every active account, `/at-risk` to surface risk signals across all systems, `/expansion` to find upsell opportunities, `/renewal-health` for upcoming renewal pipeline with risk scores.

**Lifecycle commands** — `/start-onboarding` to kick off a new customer (Asana + Drive + Shortcut + Slack), `/end-onboarding` to close it out cleanly, `/handoff` to transfer account ownership with a full context brief.

**Executive reporting** — `/executive-summary` for a portfolio-wide view combining onboarding, support, renewals, and health, `/weekly-team` to roll up the team's week for leadership.

**Utilities** — `/customer` for a pre-call briefing, `/escalate` to create a Shortcut ticket, `/tasks` to manage Asana, `/kb-draft` to write a KB article.

---

## How it works

Open a terminal, go to the `cs-repo` folder, and type `claude`. Then type any command. Claude does the work, shows you what it made, and asks before taking any action.

Connects to: **Gmail, Google Calendar, Google Drive, Asana, Intercom, Slack, and Shortcut** — all through your own work accounts. Reports save as Word docs in `out/` (and auto-copy to your Desktop if you ran the Desktop setup).

---

## Changing files in this repo

All edits go through a branch → PR → merge flow. Direct commits to `main` are blocked automatically.

1. Tell Claude what to change — it creates a branch, makes the edit, and pushes it
2. Claude opens a PR for your review
3. You merge on GitHub (squash and merge)

Full walkthrough (no tech experience needed) → [USER_GUIDE.md § GitHub tutorial](USER_GUIDE.md#github-tutorial-no-tech-experience-needed)

---

## Repo quality

Every hook and chart helper has automated tests. GitHub Actions runs them on every pull request so broken changes can't land on `main`.

```
make test       # run all 258 tests (237 Python + 21 JS)
/review-code    # structured checklist — runs tests first, then 11 fixed sections
```

See [USER_GUIDE.md § Testing and quality](USER_GUIDE.md#testing-and-quality) for details.

---

## Intercom ID reference

Each teammate needs their own ID so Claude pulls your conversations, not a teammate's. See Step 3 in [SETUP.md](SETUP.md) for how to find yours.

| Name | ID |
|---|---|
| [Your Name] | `YOUR_INTERCOM_ID` |
| [Teammate 1] | `TEAMMATE_1_ID` |
| [Teammate 2] | `TEAMMATE_2_ID` |
| [Teammate 3] | `TEAMMATE_3_ID` |
