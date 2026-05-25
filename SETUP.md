# CS Ops — Setup Guide

Setup takes about 10 minutes. You only do it once.

When you're done, see **[USER_GUIDE.md](USER_GUIDE.md)** for how to use everything.

> **On a Mac?** Follow the **Mac:** lines. **On Windows?** Follow the **PC:** lines. Skip the other half — they're alternates, not steps in sequence.

---

## Before you start

- [ ] A **Claude.ai account** (Pro or Team plan) — [claude.ai](https://claude.ai)
- [ ] The **Claude Code app** — [claude.ai/code](https://claude.ai/code)
- [ ] Access to this repo — if you're reading this, you're good
- [ ] **Python 3.10 or newer** — required by `requirements-dev.txt`. macOS ships Python 3.9, which is too old. Check with `python3 --version`; if you see 3.9, install 3.10+ via [python.org](https://python.org/downloads/) or `brew install python@3.12`.

---

## Step 1 — Download the tool

**Mac:** Press `Command + Space`, type "Terminal", press Enter.
**PC:** Press the Windows key, type "cmd", press Enter.

Paste these lines one at a time and press Enter after each:

```
git clone https://github.com/jra2s394/cs-repo.git
cd cs-repo
npm install
pip3 install -r requirements-dev.txt
```

Text will scroll by — that's normal. Wait for the cursor to come back.

> **Error on the first line?** You need to install git first. Ask your manager — takes 2 minutes.

> **`pip3` not found?** Python isn't installed. Type `python3 --version` to check. If you get an error, ask your manager — the report generation tools need it.

> **`Could not find a version that satisfies the requirement pytest>=9.0.3`?** Your Python is too old. macOS ships Python 3.9 by default; `requirements-dev.txt` needs 3.10 or newer. Install a newer Python via [python.org](https://python.org/downloads/) (recommended for non-developers) or `brew install python@3.12`, then re-run the `pip3 install` line.

---

## Step 2 — Connect your work accounts

1. Go to [claude.ai](https://claude.ai) and log in
2. Click your profile picture → **Settings** → **Integrations**
3. Connect each one with your work login:

| Account | Login to use |
|---|---|
| **Gmail** | Work Google account |
| **Google Calendar** | Same Google account |
| **Google Drive** | Same Google account |
| **Asana** | Work Asana login |
| **Intercom** | Shared Slabstack login |
| **Slack** | Work Slack account |
| **Shortcut** | Slabstack login |

Each will ask you to sign in and approve — just click through.

---

## Step 3 — Find your Intercom ID

Claude uses this number to find your conversations, not the whole team's inbox.

1. Log in to [Intercom](https://app.intercom.com)
2. Click **Settings** in the bottom left → **My Profile**
3. Look at the URL in your browser:

   `app.intercom.com/a/apps/abc123/admins/`**`12345678`**`/edit`

4. That bold number is your ID. Write it down.

Check the table at the bottom of [README.md](README.md) — your ID might already be there.

---

## Step 4 — Tell Claude who you are

You need a small file on your computer with your name, email, and Intercom ID. It lives only on your machine and is never uploaded anywhere.

> **Shortcut:** If you have Claude Code open in the `cs-repo` folder, type `/setup` and Claude will ask you the questions and write the file for you. Skip the steps below.

**Mac:**

1. In Terminal: `open ~/.claude` — a folder opens in Finder
2. Look for **CLAUDE.md** inside:
   - Found it → double-click to open in TextEdit
   - Not there → open TextEdit, make a new file, save it as `CLAUDE.md` in that folder

**PC:**

1. In Command Prompt: `explorer %USERPROFILE%\.claude` — a folder opens
2. Look for **CLAUDE.md**:
   - Found it → right-click → open with Notepad
   - Not there → open Notepad, make a new file, save it as `CLAUDE.md` in that folder

**Paste this in — replace the placeholder text with your real info:**

```
## My CS Ops Settings

Name: Your Full Name
Email: your@company.com
Intercom Admin ID: paste-your-number-from-step-3-here
Asana Team GID: paste-your-asana-team-id-here   (optional — see below)
```

Save and close.

> **Asana Team GID is optional but recommended.** Commands like `/health-score`, `/tasks`, and `/at-risk` use it to filter to your team's projects only. To find it: log in to [Asana](https://app.asana.com), open any customer project, copy the long number between `/teams/` and the next `/` in the URL. Without it, those commands fall back to workspace-wide queries — slower and noisier, but still functional.

---

## Step 5 — Desktop folder

This creates a **CS Reports** folder on your Desktop with one subfolder per report type — `Intercom/`, `Onboarding/`, `Renewals/`, `QBR/`, `Health Reports/`, and `Executive Summaries/`. Every report you generate automatically copies there so you always know where to find it. Also adds a shortcut to the `cs-repo` folder on your Desktop.

**Mac** — in Terminal:

```
bash cs-repo/scripts/setup-desktop.sh
```

**PC** — in PowerShell:

```
cd cs-repo
PowerShell -ExecutionPolicy Bypass -File scripts\setup-desktop.ps1
```

> **Why `-ExecutionPolicy Bypass`?** Windows blocks unsigned scripts by default. This flag allows the script to run just this once — it doesn't change any permanent settings.

> **Getting a permissions error?** Right-click the PowerShell icon → **"Run as administrator"**, then run the command again. This is only needed if your IT team has locked down folder creation on your Desktop.

You only do this once.

---

## You're set up — verify it

Open Terminal (Mac) or Command Prompt (PC) and type:

```
cd cs-repo
claude
```

Claude opens. Then type:

```
/check-setup
```

This runs a battery of read-only checks (CLAUDE.md filled in, all 7 MCPs reachable, Intercom ID actually matches your authenticated Intercom session, output directories present) and reports green/yellow/red. **Do not skip this** — a misconfigured Intercom ID is the highest-impact silent failure and `/check-setup` is the only thing that catches it.

When `/check-setup` is all green, see **[USER_GUIDE.md](USER_GUIDE.md)** for every command and how to use it. The "Claude Code 101" and "GitHub 101" sections at the top are required reading if any of this is new.

---

## Joining a team that's already set up?

Steps 2–5 are per person — you still need to do them yourself even if a teammate already cloned the repo.

- **Skip Step 1** — instead, run `git pull` inside the `cs-repo` folder to get the latest
- **Do Steps 2–5** — your own accounts, your own Intercom ID, your own CLAUDE.md, your own Desktop folder

---

## Something not working?

**Commands like `/daily` don't appear**
- Make sure you typed `cd cs-repo` before opening Claude
- Close Claude, go back to the `cs-repo` folder, and reopen

**An integration won't connect**
- Go to claude.ai → Settings → Integrations and reconnect it
- Gmail, Calendar, and Drive share one Google login — if one breaks, reconnect all three

**Claude is pulling the wrong person's conversations**
- Your Intercom ID in CLAUDE.md is wrong — re-do Step 3 and update the file

**A report came out empty or errored**
- Run `npm install` inside `cs-repo`
- Run `pip3 install -r requirements-dev.txt` inside `cs-repo`
- Type `python3 --version` in Terminal — if you get an error, Python isn't installed. Ask your manager.

**Can't read a Finance sheet**
- Double-check the file path and wrap it in quotes if the name has spaces
- File must be `.xlsx` or `.csv`

**Tests are failing after a code change**
- Run `make test` inside `cs-repo` — the output tells you exactly which test failed and why
- Run `make lint` to also catch lint errors (undefined names, unused imports) that tests might miss
- Fix the issue on a feature branch, not directly on `main`

**Still stuck?** Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — symptom-grouped recovery guide for runtime issues. If your symptom isn't there, ask your CS lead with the diagnostic info that doc requests.

---

## Intercom ID reference

| Name | ID |
|---|---|
| [Your Name] | `YOUR_INTERCOM_ID` |
| [Teammate 1] | `TEAMMATE_1_ID` |
| [Teammate 2] | `TEAMMATE_2_ID` |
| [Teammate 3] | `TEAMMATE_3_ID` |
