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
| Friday | `/eow` (optionally preceded by `/standup-recap`) |

Claude checks your Gmail, Calendar, Asana, and Intercom for the relevant period, writes the update in the team format, and asks if you want to post it to Slack.

**Friday shortcut — `/standup-recap`**

Before `/eow`, run `/standup-recap` to roll up the week's `data/outputs/daily-*.md` files into a single deduplicated recap. This avoids re-pulling Mon–Thu data from Gmail/Calendar that's already captured in your daily files. Read-only — no MCP calls, no drafts. Saves to `data/outputs/recap-<Friday>.md` which `/eow` can then use as its primary win source.

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

## Portfolio health — `/health-score`

Get a green/yellow/red view of every active account in one screen.

Type `/health-score`. Claude pulls live data from Asana, Intercom, Shortcut, Gmail, and Calendar for every active account and scores each one against four dimensions: last contact recency, overdue tasks, open Intercom conversations, and Shortcut blockers. Shows a portfolio summary table, flags 🔴 accounts with a specific recommended action, and surfaces any renewals in the next 90 days. After reviewing the draft, Claude builds a branded `.docx` and auto-copies to `Desktop/CS Reports/Health Reports/`.

---

## At-risk triage — `/at-risk`

Surface all risk signals across the portfolio in one place — read-only.

Type `/at-risk`. Claude searches Asana (overdue tasks), Intercom (unanswered conversations), Shortcut (blocked stories), Gmail (unanswered threads and escalation language), and Calendar (dark accounts with no recent or upcoming meetings). Groups results into 🔴 Immediate / 🟡 Watch / 🟢 Recently Resolved. For each 🔴 item, offers a specific recommended next action you can approve and execute.

Nothing is created or sent in this command — it's a triage view only.

---

## Expansion opportunities — `/expansion`

Find customers ready for upsell or new location conversations.

Type `/expansion`. Claude searches email, Intercom, Read.ai meeting reports, and Asana for growth signals: new plant mentions, feature requests, referral language, and recently-live accounts in the prime expansion window. Scores each account and ranks them by expansion readiness. Offers to draft outreach messages or talking points for any account you want to pursue.

---

## Renewal health — `/renewal-health`

See the full renewal pipeline with risk scores and recommended actions.

Type `/renewal-health`. Claude searches Gmail, Asana, and Intercom for renewal signals and derives a risk score (🔴 High / 🟡 Medium / 🟢 Low) for each account. Shows days until renewal, ARR at stake, current status, and the specific next action for each 🔴 account. After reviewing the draft, Claude builds a branded `.docx` and auto-copies to `Desktop/CS Reports/Renewals/`.

---

## Customer snapshot — `/customer`

Get a one-screen briefing before a call or when you need to get up to speed fast.

Type `/customer` (or `/customer [CUSTOMER_A]`). Claude pulls from Intercom, Gmail, Calendar, Asana, and Shortcut in parallel and shows you: current status, open conversations, recent emails and meetings, upcoming calls, open Asana tasks, open Shortcut stories, and anything flagged 🔴. Read.ai meeting reports are used as the authoritative meeting source when available.

---

## Morning inbox triage — `/inbox-triage`

Sort the overnight email pile into Respond / Escalate / Customer Signal / FYI in under 60 seconds.

Type `/inbox-triage` (or `/inbox-triage since Friday` to widen the window). Claude pulls Gmail for the chosen range (default: `newer_than:1d`, excluding promotions/social/drafts) and sorts every thread into one of four buckets:

- **🔴 Respond today** — threads where you're the next expected reply, with a one-line summary and a suggested action
- **🟣 Escalate** — bug reports → suggests `/escalate`; onboarding blockers → suggests `/story-CSEng`
- **🟡 Customer signal** — competitor mentions, expansion language (new plants/regions), risk language, renewal context — with the exact trigger phrase quoted
- **🟢 FYI** — Asana/GitHub/Slack notifications and digests, summarized by sender count (not listed individually)

Ends with "top picks for the next hour" so you know where to start. If you want, ask for reply drafts on any 🔴 items — Claude writes them inline and only sends after you per-draft approve. Never auto-sends.

---

## Find a customer when you don't know the exact name — `/customer-search`

Fuzzy lookup across Asana, Shortcut, Intercom, and Gmail. Use this before `/customer`, `/qbr`, etc. when you've only got a partial name, a misspelling, or a contact's first name.

Type `/customer-search hollingshead` (or `/customer-search hi grade`, `/customer-search hi-grade.com`). Claude searches all four systems in parallel, clusters the matches into candidate customers using domain and substring signals, and ranks each candidate with a 🟢/🟡/🔴 confidence label. If exactly one high-confidence match exists, Claude offers to run `/customer` on it. Read-only — nothing is created or modified.

---

## Meeting prep — `/meeting-prep`

Get a briefing for every customer meeting in the next 24 hours — all at once, without running `/customer` for each one.

Type `/meeting-prep` → Claude scans your calendar for customer-facing meetings in the next 24 hours → pulls Intercom, Gmail, Asana, and Shortcut context for each → presents one brief per meeting, ordered by start time.

---

## Follow-up email — `/follow-up`

After a customer call, draft a follow-up email with action items.

Type `/follow-up` → Claude finds the most recent completed meeting → searches for the Read.ai report (if the meeting was recorded) → drafts a follow-up email with summary and action items → review it → say "send it." Claude never sends without approval.

---

## Go-live readiness — `/go-live`

Before a customer launch, check every system for open blockers.

Type `/go-live` → give the customer name and go-live date → Claude checks Asana (open tasks), Shortcut (open stories), Intercom (unanswered conversations), and Gmail (unanswered emails) → presents a readiness scorecard with 🔴/🟡/🟢 status per area → offer to create Asana tasks for anything blocking.

---

## QBR prep — `/qbr`

Prepare a Quarterly Business Review for a customer — data pulled, wins sourced, agenda drafted.

Type `/qbr` → give the customer name and quarter → Claude pulls a full quarter of Intercom, Gmail, Calendar, Asana, and Shortcut data → drafts the full QBR brief (wins, open issues, renewal context, agenda) → review it → approve → Claude generates a branded `.docx` in `out/` and auto-copies to `Desktop/CS Reports/QBR/`. Every win is sourced — no hallucinated outcomes.

**QBR templates** (for use standalone or as `/qbr` output):
- `slabstack-cs/qbr-templates/qbr-standard.md` — standard QBR for all active customers
- `slabstack-cs/qbr-templates/qbr-at-risk.md` — modified QBR for at-risk customers
- `slabstack-cs/qbr-templates/qbr-expansion.md` — QBR focused on upsell and expansion

---

## Start an onboarding — `/start-onboarding`

Kick off a new customer from scratch — one command, all four systems.

Type `/start-onboarding`. Claude collects the customer name, CSM, CARR, go-live date, and key contacts, then drafts all four setup items in a single block for review: the Asana onboarding project (from the standard template), the Google Drive folder, the Shortcut CSEng story, and the Slack channel name. After explicit approval, Claude creates the first three and gives you the Slack channel creation instructions. Once you confirm the channel exists, Claude posts the resource links.

---

## End an onboarding — `/end-onboarding`

Close out a completed onboarding cleanly with a verified checklist and post-closure tasks.

Type `/end-onboarding`. Claude pulls the current state from Asana, Intercom, Shortcut, Gmail, and Calendar and generates a closure checklist with 🔴 flags for anything that needs resolution before closing. After reviewing, Claude drafts the go-live confirmation email and the post-closure Asana tasks (30-day check-in, customer master update, QBR scheduling) for your approval before creating any of them.

---

## CSM handoff — `/handoff`

Transfer account ownership with a complete context brief — no institutional knowledge lost.

Type `/handoff`. Claude pulls 90 days of Intercom, Gmail, Calendar, Asana, Shortcut, and Read.ai data for the account and generates a structured handoff brief: relationship context, wins, open issues, outstanding commitments, active tasks, upcoming meetings, and a draft introduction email. You review the brief, approve any edits, and then decide whether to send the intro email and create post-handoff Asana tasks.

---

## Executive summary — `/executive-summary`

Generate a portfolio-wide executive summary for leadership review.

Type `/executive-summary`. Claude pulls a period's worth of data from all connected systems and drafts a cross-portfolio view: active accounts, support volume, onboarding health, renewal pipeline, open issues, upcoming events, and key highlights. After reviewing the draft, Claude builds a branded `.docx` and auto-copies to `Desktop/CS Reports/Executive Summaries/`.

---

## Weekly team summary — `/weekly-team`

Roll up what the full team accomplished this week for manager standup or team Slack.

Type `/weekly-team`. Claude pulls activity across Asana, Intercom, Shortcut, Calendar, and Gmail for each teammate listed in CLAUDE.md and drafts a team summary with top wins, per-person highlights, support volume, and onboarding status. Review the draft, then approve for posting to Slack with channel confirmation.

---

## Escalate to Shortcut — `/escalate`

Turn an Intercom conversation into a Shortcut ticket for the product team.

Type `/escalate` → paste the conversation URL → Claude drafts the ticket (title, description, steps to reproduce, severity) → review it → say "create it." Claude never creates the ticket until you approve the draft.

---

## Create a CS Engineering story — `/story-CSEng`

For CS Engineers: create a Shortcut story to support a CSM or track customer-specific engineering work (onboarding blockers, config tasks, escalations, bug reports).

Type `/story-CSEng` → Claude asks for the customer, story type, description, affected CSM, and priority → searches Shortcut for existing stories → drafts the full story → review it → say "create it."

**Story types:**
- 🐛 Bug — something broken in the product
- ⚙️ Config task — customer-specific setup (quotes, workflows, email, integrations)
- 🚧 Onboarding blocker — blocking go-live or a training milestone
- 💬 CSM support request — CSM needs eng help to answer a question or resolve an issue
- 🔧 Feature / custom work — non-standard request that needs product/eng awareness

After creating, Claude will ask if you want to notify the CSM via Slack with the story link.

---

## Check the eng review queue — `/prs`

For CS Engineers: see every Shortcut story that's sitting and waiting on engineering review or approval.

Type `/prs` → Claude searches the CSEng workflow and Engineering workflow in parallel → shows stories grouped by urgency with how long each has been waiting → offer to add a comment or ping someone.

**What it surfaces:**
- 🔴 Stories in "Ready for Eng Review" or "001 - Product Review ASAP" (needs action now)
- 🔴 Any review-state story waiting 5+ days
- 🟡 Stories in "In Review" or "Ready for Review" (in progress, watching)
- 🟢 Stories in "Ready to Merge" (approved, just needs the merge)

Nothing is created or changed — this is a read-only status check.

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
1. Run all 394 automated tests first (`make test`) — if any fail, it stops and tells you exactly what's wrong
2. Run both linters (`make lint` — ruff for Python, biome for JS) to confirm no undefined names or unused imports
3. Work through a fixed 22-section checklist covering every hook, library file, report layout rule, chart helper, and read-only/draft-first command contract
4. Report a pass/fail table at the end

This gives you the same check every time, not a different result each session. If everything passes, you'll see "394 passed, 0 failed" and a full green table.

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

Before opening a PR for any code change, run the test suite AND the linters:

```
make test    # 394 automated tests (265 Python + 129 JavaScript)
make lint    # ruff (Python) + biome (JS) — catches undefined names, unused imports
```

The tests cover every hook, every lib helper (csv-export, report-theme, data-loader, copy-to-desktop, report_charts), every report's CLI contract, and the publish pipeline. The linters catch the runtime-bug class that tests can miss — e.g., a missing `require()` in a code path tests don't exercise.

If all pass you'll see `265 passed, 0 failed` (Python), each JS suite prints its own count, and both linters print "All checks passed!".

GitHub Actions runs all of `make test` + `make lint` automatically on every pull request. A PR can't sneak a broken change onto `main` without CI catching it first.

For a full structured review (tests + lint + 22-section checklist), use `/review-code` — see above.

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
| Standup updates + recaps | `data/outputs/` as `.md` files |
| All reports | `out/` as `.docx` files (plus a `.csv` sidecar for spreadsheets) |
| Desktop copies (Mac) | `~/Desktop/CS Reports/{Intercom, Onboarding, Renewals, QBR, Health Reports, Executive Summaries}` |
| Desktop copies (PC) | `%USERPROFILE%\Desktop\CS Reports\{Intercom, Onboarding, Renewals, QBR, Health Reports, Executive Summaries}` |

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
| `/standup-recap` | Aggregate the week's `daily-*.md` files before `/eow` (no MCP calls) |
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
| `/customer-search` | Fuzzy customer lookup across all systems when you don't know the exact name |
| `/inbox-triage` | Morning Gmail triage — Respond/Escalate/Signal/FYI buckets, drafts only on request |
| `/meeting-prep` | Briefings for all customer meetings in the next 24h |
| `/follow-up` | Draft follow-up email after a call |
| `/go-live` | Go-live readiness check — blockers across all systems |
| `/at-risk` | Surface all at-risk customers — read-only triage |
| `/health-score` | Portfolio health scorecard — green/yellow/red per account |
| `/expansion` | Identify expansion and upsell opportunities |
| `/renewal-health` | Renewal pipeline with risk scores and next actions |
| `/executive-summary` | Portfolio-wide executive summary for leadership |
| `/weekly-team` | Weekly CS team summary for standup or Slack |
| `/start-onboarding` | Kick off a new customer — Asana, Drive, Shortcut, Slack |
| `/onboarding-status-report` | Customer-facing onboarding status report |
| `/end-onboarding` | Close out a completed onboarding cleanly |
| `/handoff` | Generate a CSM handoff brief |
| `/qbr` | QBR prep — data pulled, wins sourced, agenda drafted |
| `/escalate` | Escalate Intercom → Shortcut ticket |
| `/story-CSEng` | CS Eng: create a Shortcut story for CSM support |
| `/prs` | CS Eng: show Shortcut stories pending eng review |
| `/tasks` | View and manage Asana tasks |
| `/kb-draft` | Draft a KB article for Intercom |
| `/review-code` | Run tests + structured quality checklist |
