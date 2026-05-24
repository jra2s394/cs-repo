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

1. Read `claude.md` from this repo (the public template).
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

Tell the user:

```
Everything looks good. Here's a quick smoke test to confirm it's all working:

  1. Type /daily — Claude should start pulling your Gmail, Calendar, Asana, and Intercom data
  2. If it asks "which calendar / which inbox?" that means an integration needs reconnecting

You're all set. A few things to know:

  • Claude never posts or sends anything without your approval — it always shows a draft first
  • Reports save to out/ (and Desktop/CS Reports/ if you ran scripts/setup-desktop.sh)
  • The full command list is in USER_GUIDE.md or type /help
  • If something breaks, check SETUP.md → "Something not working?" section

Welcome to the team.
```
