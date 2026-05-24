# CS Ops Tool — User Guide

Not set up yet? Start with **[SETUP.md](SETUP.md)** — takes about 10 minutes.

---

## Opening the tool

Every session:

```
cd cs-repo
claude
```

Claude opens. Type any command.

---

## The one rule

**Claude never posts, sends, or creates anything without showing it to you first.**

Every command: Claude gathers the data → shows you the output → waits for your OK → then acts. If you close Claude before approving, nothing happens.

---

## Standup updates

| Day | Command |
|---|---|
| Monday | `/weekstart` |
| Tuesday – Friday | `/daily` |
| Wednesday | `/midweek` |
| Friday | `/eow` |

Claude checks your Gmail, Calendar, Asana, and Intercom for the relevant period, writes the update in the team format, and asks if you want to post it to Slack.

Read the draft before approving. Common fixes: remove a meeting that got cancelled, move a task that's still in progress, clarify anything flagged 🔴. Just tell Claude what to change.

---

## Intercom reports

Pulls live data and saves a Word doc with conversation counts, response times, and a customer breakdown.

| Command | Use it for |
|---|---|
| `/intercom-daily` | Quick check — today vs yesterday |
| `/intercom-weekly` | Weekly rhythm check |
| `/intercom-monthly` | Month-over-month review |
| `/intercom-quarterly` | QBR prep, leadership updates |
| `/intercom-yeartodate` | Annual reviews, board prep |

No file needed — Claude pulls directly from Intercom. Doc saves to `out/` (and `Desktop/CS Reports/Intercom/` if you ran the Desktop setup).

---

## Onboarding reports

Shows which accounts are on track, at risk, or completed. Pulls from the Finance Pending Transactions sheet and cross-checks with your Asana tasks.

**Before running:** get the latest Pending Transactions Excel file from Finance and save it to your Downloads.

| Command | Use it for |
|---|---|
| `/onboarding-weekly` | At-risk flags + Asana task health |
| `/onboarding-monthly` | Month-over-month + week-by-week breakdown |
| `/onboarding-quarterly` | Quarter-over-quarter + YTD summary |
| `/onboarding-yearly` | Full year + top accounts + all-time totals |

**To run:** type the command → Claude asks for the file path → paste it → Claude saves the Word doc.

```
Mac: /Users/yourname/Downloads/Slabstack Pending Transactions 4 2 26.xlsx
 PC: C:\Users\yourname\Downloads\Slabstack Pending Transactions 4 2 26.xlsx
```

> Wrap the path in quotes if the filename has spaces. Accounts labeled "Backlog Subscription" show in a separate section and aren't counted in the main numbers.

---

## Renewal invoice reports

Tells Finance exactly what to invoice each customer. Claude reads the Finance renewals sheet and calculates the amounts — volume contracts (quantity × unit cost) and fixed-rate contracts (ARR × uplift) are both handled automatically.

**Before running:** get the monthly renewals Excel file from Finance and save it to your Downloads.

| Command | Use it for |
|---|---|
| `/renewals-thismonth` | What Finance needs to bill right now |
| `/renewals-nextmonth` | Next month's pipeline — review before month end |
| `/renewals-nextquarter` | Three-month forecast, grouped by month |

**To run:** same as onboarding — type the command, paste the file path when asked.

> For the quarterly report: if Finance only has one month's file, run it anyway. Missing months show as "Data Pending" automatically.

---

## Customer snapshot — `/customer`

Get a one-screen briefing before a call or when you need to get up to speed fast.

Type `/customer` (or `/customer [CUSTOMER_A]`). Claude pulls from Intercom, Gmail, Calendar, and Asana in parallel and shows you: current status, open conversations, recent emails and meetings, upcoming calls, open Asana tasks, and anything flagged 🔴.

---

## Escalate to Shortcut — `/escalate`

Turn an Intercom conversation into a Shortcut ticket for the product team.

Type `/escalate` → paste the conversation URL → Claude drafts the ticket (title, description, steps to reproduce, severity) → review it → say "create it." Claude never creates the ticket until you approve the draft.

---

## Manage tasks — `/tasks`

Shows your open Asana tasks grouped by urgency: overdue, due today, due this week, upcoming.

Tell Claude what to do in plain language: "mark the [CUSTOMER_A] task complete," "add a task for [CUSTOMER_B] go-live next Friday," "move the [CUSTOMER_C] item to next week." Claude confirms before making any change.

---

## Draft a KB article — `/kb-draft`

Type `/kb-draft` → give Claude a topic or paste an Intercom conversation URL → Claude writes a full draft (title, intro, step-by-step body, related articles) → review and ask for changes → say "publish it."

---

## Review and quality check — `/review-code`

Runs a structured quality check on the repo. Use this any time you've made changes to hooks, reports, or library files and want to verify nothing is broken.

Type `/review-code`. Claude will:
1. Run all 237 automated tests first — if any fail, it stops and tells you exactly what's wrong
2. Work through a fixed 9-section checklist covering every hook, report layout rule, and chart helper
3. Report a pass/fail table at the end

This gives you the same check every time, not a different result each session. If everything passes, you'll see "237 passed, 0 failed" and a full green table.

> Use `/review-code` instead of asking Claude to "review the code" or "check for bugs." The structured checklist is more thorough and consistent than a freeform review.

---

## Saving changes to the repo (Git workflow)

Any time you change a file in `cs-repo` — a prompt, a command, a script — those changes need to go through GitHub before they're "official." This keeps the shared copy clean and makes it easy to undo anything that breaks.

The required flow has five steps:

1. **Create a branch** — a branch is your own working copy, separate from the shared `main` version. Nothing you do on a branch affects anyone else until it's merged.
2. **Make your changes** — edit files, add content, ask Claude to update things.
3. **Commit** — save a snapshot of your changes with a short description.
4. **Push** — upload your branch to GitHub so others can see it.
5. **Open a pull request (PR) and merge** — ask for the branch to be merged into `main`. This is the moment your change becomes official.

Claude handles steps 1–4 for you. Step 5 you do on GitHub (takes about 30 seconds — see the tutorial below).

> **Why not just save directly to main?** The hooks in this repo block it. Every change needs a branch and a PR so there's always a record and an easy way to roll back.

### Testing and quality

Before opening a PR for any code change, run the test suite to make sure nothing is broken:

```
make test
```

This runs 237 automated tests that cover every hook and chart helper. If all pass, you'll see `237 passed` and a green summary. If something fails, the output tells you the exact file and line.

GitHub Actions runs the same tests automatically on every pull request. A PR can't sneak a broken change onto `main` without the CI catching it first.

For a full structured review (tests + checklist), use `/review-code` — see above.

### What to tell Claude

When you want to make a change, just describe it:

> "Update the `/daily` prompt to include a section for blocked Asana tasks."

Claude will make the edits, create a branch, commit the change, and push it. Then it will ask if you want to open a PR. Say yes — then finish on GitHub using the tutorial below.

---

## GitHub tutorial (no tech experience needed)

GitHub is where the repo lives online. You use it for one thing in this workflow: reviewing and merging a pull request (PR). A PR is just a proposed change waiting for approval.

### Step 1 — Open the PR

After Claude pushes your branch, it will print a link like:

```
https://github.com/jra2s394/cs-repo/pull/new/chore/your-branch-name
```

Click that link. It opens GitHub in your browser.

### Step 2 — Fill in the PR form

You'll see two fields:

- **Title** — a short description of what changed (Claude will suggest one)
- **Description** — a short explanation of why (Claude fills this in using the team template)

Review both. Edit anything that looks wrong. Then click the green **"Create pull request"** button.

### Step 3 — Merge the PR

Once the PR is open, you'll see a page with the title, description, and a list of changed files at the bottom.

Scroll down to the merge button. Click the small arrow on the right side of the green button and select **"Squash and merge"** — this keeps the history clean by combining all your commits into one.

Then click **"Confirm squash and merge."**

That's it. Your change is now live on `main`.

### Step 4 — Delete the branch (optional but tidy)

After merging, GitHub shows a **"Delete branch"** button. Click it. The branch has done its job.

---

### GitHub quick-reference

| What you see | What it means |
|---|---|
| **main** | The official shared version of the repo |
| **Branch** | Your private working copy — safe to edit |
| **Commit** | A saved snapshot with a description |
| **Pull request (PR)** | A proposal to merge your branch into main |
| **Squash and merge** | Combine all commits into one, then merge — keeps history clean |
| **Files changed tab** | Shows exactly what was added (green) or removed (red) |

---



| What | Where |
|---|---|
| Standup updates | `data/outputs/` as `.md` files |
| All reports | `out/` as `.docx` files |
| Desktop copies (Mac) | `~/Desktop/CS Reports/Intercom`, `Onboarding`, or `Renewals` |
| Desktop copies (PC) | `%USERPROFILE%\Desktop\CS Reports\Intercom`, `Onboarding`, or `Renewals` |

---

## When something goes wrong

**Command not found** — type `cd cs-repo` first, then reopen Claude

**Report came out blank** — run `npm install` inside `cs-repo`; check your file path to the Finance sheet

**Wrong person's Intercom conversations** — your Intercom ID in `~/.claude/CLAUDE.md` is wrong; re-do Step 3 in [SETUP.md](SETUP.md)

**Integration not connecting** — go to claude.ai → Settings → Integrations and reconnect; Gmail, Calendar, and Drive share one Google login

**Still stuck?** Ask your CS lead.

---

## Quick reference

| Command | What it does |
|---|---|
| `/daily` | Standup — Tue–Fri |
| `/midweek` | Standup — Wednesday extended |
| `/eow` | Standup — Friday full recap |
| `/weekstart` | Standup — Monday |
| `/intercom-daily` | Intercom report — today vs yesterday |
| `/intercom-weekly` | Intercom report — this week |
| `/intercom-monthly` | Intercom report — this month |
| `/intercom-quarterly` | Intercom report — this quarter |
| `/intercom-yeartodate` | Intercom report — full year |
| `/onboarding-weekly` | Onboarding report — this week |
| `/onboarding-monthly` | Onboarding report — this month |
| `/onboarding-quarterly` | Onboarding report — this quarter |
| `/onboarding-yearly` | Onboarding report — full year |
| `/renewals-thismonth` | Renewal invoices — bill now |
| `/renewals-nextmonth` | Renewal invoices — next month |
| `/renewals-nextquarter` | Renewal invoices — three-month forecast |
| `/customer` | Customer snapshot before a call |
| `/escalate` | Escalate Intercom → Shortcut ticket |
| `/tasks` | View and manage Asana tasks |
| `/kb-draft` | Draft a KB article for Intercom |
| `/review-code` | Run tests + structured quality checklist |
