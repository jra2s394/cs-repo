---
description: First-time setup wizard — fills in your personal CLAUDE.md, checks integrations, and confirms you're ready to use the tool
---

Read `CLAUDE.md` from this repo before starting.

You are walking a new teammate through first-time setup. Be friendly, clear, and concise. Do everything step by step — never move to the next step until the current one is complete.

---

## Step 0 — Check prerequisites

Check whether `~/.claude/CLAUDE.md` exists.

**If it does not exist:**
Tell the user:

> `~/.claude/CLAUDE.md` is missing. Let's create it now. I'll ask you a few questions and write the file for you.

Then skip to Step 1.

**If it exists:**
Read it. Scan for any remaining `[bracket]` placeholders (text that looks like `[Your Name]`, `[Your Title]`, etc.).

- If none remain: say "Your CLAUDE.md looks fully configured. Want to verify your integrations anyway? (yes / no)" and wait. If no, stop.
- If some remain: say "Found unfilled placeholders in your CLAUDE.md. Let's fill them in." Then continue to Step 1, but only ask about the fields that still have placeholders.

---

## Step 1 — Gather personal info

Send this message exactly:

```
A few questions to personalize your setup:

1. Your full name:
2. Your job title (e.g., "Customer Success Manager"):
3. Your company name (e.g., "Slabstack"):
4. Your time zone (e.g., "Mountain Time"):
5. Your city and state (e.g., "Denver, Colorado"):
6. Your work email:
7. One sentence describing your role (e.g., "Managing onboarding and support for concrete producers across North America."):
```

Wait for all answers before continuing. If they skip any, ask for it specifically before moving on.

---

## Step 1.5 — Identify role

Send this message:

```
One quick question before we continue — which role best describes you?

  1. Customer Success Manager (CSM)
  2. Customer Success Engineer (CS Engineer)
  3. Customer Success Director
  4. President of Slabstack
```

Wait for their answer. Record their role — you'll use it in Step 6 to show them the commands most relevant to their work.

---

## Step 2 — Get Intercom admin ID

Send this message:

```
One more thing — your Intercom admin ID. Claude uses this number to pull your conversations specifically, not the whole team's inbox.

To find it:
  1. Log in to Intercom
  2. Click Settings → My Profile
  3. Look at the URL — it ends with /admins/XXXXXXXX/edit
  4. That 8-digit number is your ID

What's your Intercom admin ID?
```

Wait for the answer.

---

## Step 3 — Confirm and write the file

Show the user exactly what will be written:

```
Here's what I'll write to ~/.claude/CLAUDE.md. Confirm to proceed:

---
## My CS Ops Settings

Name: [their name]
Title: [their title]
Company: [their company]
Time zone: [their time zone]
Location: [their location]
Email: [their email]
Role: [their role description]
Intercom Admin ID: [their ID]
---
```

Wait for explicit confirmation ("yes", "looks good", "go ahead") before writing anything.

---

## Step 4 — Write the file

Once confirmed:

1. Read `CLAUDE.md` from this repo (the public template).
2. Replace each placeholder in that template with the user's answers:
   - `[Your Name]` → their name
   - `[Your Title]` → their title
   - `[Your Company]` → their company
   - `[Your time zone]` → their time zone
   - `[Your Location]` → their location
   - `[your-email@company.com]` → their email
   - The role description placeholder → their description
   - `YOUR_INTERCOM_ID` in the Intercom admin IDs table → their ID
3. Write the result to `~/.claude/CLAUDE.md`.

Tell the user: "Written to ~/.claude/CLAUDE.md."

---

## Step 5 — Check integrations

Ask:

```
Let's make sure your integrations are connected. Have you already connected these in claude.ai → Settings → Integrations?

  [ ] Gmail
  [ ] Google Calendar
  [ ] Google Drive
  [ ] Asana
  [ ] Intercom
  [ ] Slack
  [ ] Shortcut

Reply with which ones are missing, or "all connected" if you're good.
```

Wait for the answer.

If any are missing, tell them:
> Go to claude.ai → Settings → Integrations and connect each one. Gmail, Calendar, and Drive all use the same Google login — connect one and the others follow. Come back and run `/setup` again when you're done.

Then stop.

If all are connected, continue.

---

## Step 6 — Smoke test

Start with:

```
Everything looks good. Here's a quick smoke test to confirm it's all working:

  1. Type /daily — Claude should start pulling your Gmail, Calendar, Asana, and Intercom data
  2. If it asks "which calendar / which inbox?" that means an integration needs reconnecting
```

Then show the role-specific command list based on their answer from Step 1.5:

---

**If CSM:**

```
Your most-used commands:

  /daily                  Standup update — Tue–Fri
  /midweek                Wednesday extended standup
  /eow                    Friday end-of-week recap
  /weekstart              Monday week-start update
  /customer               Full customer snapshot before a call
  /meeting-prep           Briefings for all customer meetings in the next 24h
  /follow-up              Draft follow-up email after a call
  /go-live                Go-live readiness check before a customer launch
  /at-risk                Surface all at-risk customers — read-only triage
  /start-onboarding       Kick off a new customer onboarding
  /end-onboarding         Close out a completed onboarding
  /handoff                Generate a handoff brief when account ownership changes
  /tasks                  View and manage your Asana tasks
  /escalate               Escalate an Intercom conversation to a Shortcut ticket
  /kb-draft               Draft a KB article from a topic or conversation
  /intercom-weekly        Weekly Intercom support report
```

---

**If CS Engineer:**

```
Your most-used commands:

  /prs              Show all Shortcut stories pending eng review — your queue
  /story-CSEng      Create a Shortcut story to support a CSM or track customer eng work
  /customer         Full customer snapshot before a call
  /tasks            View and manage your Asana tasks
  /escalate         Escalate an Intercom conversation to a Shortcut ticket
```

---

**If CS Director:**

```
Your most-used commands:

  /daily                  Standup update — Tue–Fri
  /midweek                Wednesday extended standup
  /eow                    Friday end-of-week recap
  /weekstart              Monday week-start update
  /health-score           Portfolio health scorecard — green/yellow/red per account
  /at-risk                Surface all at-risk customers — read-only triage
  /expansion              Identify expansion and upsell opportunities
  /renewal-health         Renewal pipeline with risk scores
  /executive-summary      Portfolio-wide executive summary for leadership
  /weekly-team            Weekly CS team summary
  /customer               Full customer snapshot before a call
  /meeting-prep           Briefings for all customer meetings in the next 24h
  /qbr                    QBR prep — data pulled, wins sourced, agenda drafted
  /go-live                Go-live readiness check before a customer launch
  /tasks                  View and manage your Asana tasks
  /onboarding-weekly      Onboarding health — this week
  /onboarding-monthly     Onboarding health — this month
  /renewals-thismonth     Renewal invoice report — what Finance bills now
  /renewals-nextquarter   Three-month renewal forecast
  /intercom-monthly       Monthly Intercom support report
  /review-code            Run the repo QA checklist
```

---

**If President:**

```
Your most-used commands:

  /executive-summary      Portfolio-wide executive summary for leadership
  /health-score           Portfolio health scorecard — all accounts at a glance
  /renewal-health         Renewal pipeline with risk scores and ARR at stake
  /onboarding-quarterly   Quarterly onboarding scorecard
  /onboarding-yearly      Full-year onboarding summary + top accounts
  /intercom-quarterly     Quarterly Intercom support intelligence
  /intercom-yeartodate    Full-year Intercom report
  /renewals-nextquarter   Three-month renewal forecast
  /qbr                    QBR prep — data pulled, wins sourced, agenda drafted
  /customer               Full customer snapshot before a call
```

---

Then close with:

```
A few things to know:

  • Claude never posts or sends anything without your approval — it always shows a draft first
  • Reports save to out/ (and Desktop/CS Reports/ if you ran scripts/setup-desktop.sh)
  • The full command list is in USER_GUIDE.md
  • If something breaks, check SETUP.md → "Something not working?" section

Welcome to the team.
```
