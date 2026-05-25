# Team Setup — joining the CS Ops tool

You've been invited to use this tool. This guide gets you from zero to "ran my first command" in about 20 minutes. It assumes nothing about your technical background — if you've never touched GitHub or a terminal, you'll still finish.

If you're reading this because you're the **owner** of the canonical repo and want to invite a teammate, skip to [Inviting a teammate](#inviting-a-teammate-owner-only) at the bottom.

> **On a Mac?** Follow the **Mac:** lines. **On Windows?** Follow the **PC:** lines. Skip the other half — they're alternates, not steps in sequence.

---

## Before you start

You need three things, all free to set up:

1. A **GitHub account** — [github.com](https://github.com)
2. A **Claude.ai account** with Pro or Team plan — [claude.ai](https://claude.ai)
3. The **Claude Code app** installed — [claude.ai/code](https://claude.ai/code)

Plus the link to the repo your team owner sent you (something like `github.com/<owner>/cs-repo`).

If you're missing any of these, get them now before continuing.

---

## Step 1 — Fork the repo

A **fork** is your own personal copy of the repo on GitHub. It lives at your username (`github.com/YOU/cs-repo`) instead of the team owner's. You make changes in your fork, then propose them back to the team copy via a Pull Request.

1. Go to the team repo URL your owner sent you (e.g. `github.com/jra2s394/cs-repo`)
2. Click the **Fork** button in the top right
3. GitHub asks which account to fork into — pick your own username
4. Wait ~10 seconds for the fork to finish
5. You're now looking at YOUR fork — the URL is `github.com/YOUR-USERNAME/cs-repo`

> **What's a fork for?** Your fork is yours alone — you can break things, experiment, write half-finished commands without affecting the team. When you have a change worth sharing, you open a Pull Request from your fork back to the team copy. The team owner reviews and merges.

---

## Step 2 — Clone YOUR fork to your computer

Cloning downloads the repo from GitHub to your laptop so you can run it.

**Mac:** Press `Command + Space`, type "Terminal", press Enter.
**PC:** Press the Windows key, type "cmd", press Enter.

Paste these lines one at a time and press Enter after each. **Replace `YOUR-USERNAME` with your actual GitHub username.**

```
git clone https://github.com/YOUR-USERNAME/cs-repo.git
cd cs-repo
npm install
pip3 install -r requirements-dev.txt
```

Text scrolls by — that's normal. Wait for the cursor to come back after each line.

> **Error on the first line?** You need to install git. Mac: `xcode-select --install` in Terminal. PC: download from [git-scm.com](https://git-scm.com/download/win).

---

## Step 3 — Set the upstream remote (so you can pull team updates)

Your local copy currently knows about YOUR fork (the "origin"). You also want it to know about the team copy (the "upstream") so you can pull in updates the team makes.

Paste this — **replace `OWNER-USERNAME` with the team owner's GitHub username** (e.g. `jra2s394`):

```
git remote add upstream https://github.com/OWNER-USERNAME/cs-repo.git
git remote -v
```

The last command should print 4 lines: two for `origin` (your fork) and two for `upstream` (the team copy). If you see all 4, you're set.

> **What this does:** when the team owner merges a change you want, you run `git fetch upstream && git merge upstream/main` to pull it into your local copy. You don't need to do this often — only when you want updates.

---

## Step 4 — Follow SETUP.md from Step 2 onward

The per-person config (connecting your accounts, finding your Intercom ID, personalizing CLAUDE.md, creating the Desktop folder) is the same for every teammate. It's all in **[SETUP.md](SETUP.md)** — start at **Step 2** (Connect your work accounts) since you've already done Step 1 (you cloned your fork, not the team copy).

Come back here when SETUP.md says "You're set up".

---

## Step 5 — Validate everything is connected

Open Claude in the repo directory:

```
cd cs-repo
claude
```

Then type:

```
/check-setup
```

This runs a battery of read-only checks: personal CLAUDE.md filled in, all 7 MCPs reachable, Intercom ID actually matches your authenticated Intercom session, output directories present. You'll get a green/yellow/red report.

- **All 🟢** → you're ready. Move to Step 6.
- **Any 🔴** → the report tells you exactly what to fix.
- **Any 🟡** → optional items missing (e.g., Desktop folder if you skipped that part of SETUP.md). Fine to proceed.

---

## Step 6 — Run your first command

The shortest path to feeling the tool work:

```
/customer
```

Claude will ask which customer, then pull a one-screen briefing from Gmail, Calendar, Asana, Intercom, and Shortcut. Read the output. Nothing was sent or posted — every command in this tool shows you the result and waits for your approval before doing anything.

Now run:

```
/daily
```

This writes today's standup update from your real data, in the team format, and asks if you want to post to Slack. Read it. **Do not post yet** — say "tweak X" or "this win didn't happen" and Claude will fix it. Once it's right, then approve.

You're using the tool.

---

## What to do next

- **Bookmark [USER_GUIDE.md](USER_GUIDE.md)** — every command, what it does, when to use it. Read the "Claude Code 101" and "GitHub 101" sections if any of this is new.
- **Run `/commands`** any time you forget what's available — it lists every slash command live.
- **Try the morning routine for a week:** `/inbox-triage` after coffee, `/meeting-prep` before your first call.
- **When the tool surprises you** (good or bad), tell your team owner. The tool is shaped by friction reports — that's how it gets better.

### Day 1 → Week 4 rhythm

A cadence that gets you from "I ran one command" to "I can help onboard the next person" in about a month:

| When | What | Why |
|---|---|---|
| **Day 1** | `/check-setup` returns all 🟢 | Catches the silent failures (Intercom ID mismatch, MCP not actually connected) before they bite |
| **Day 2–3** | Run `/daily` two days in a row, eyeball the output | Confirms your time zone is right and you're getting *your* data, not a teammate's |
| **End of week 1** | Try `/inbox-triage` and `/meeting-prep` before your first morning call | Confirms Gmail + Calendar are returning real data and the morning routine fits your workflow |
| **Week 2** | Run a report — `/health-score` or `/intercom-weekly` | Confirms the Finance / Intercom integration path works end-to-end, and you've seen the `.docx` output shape |
| **Week 3** | Try an approval-required command — `/story-CSEng` or `/escalate` | Confirms the draft-before-create flow makes sense (Claude shows a draft, you approve, *then* it acts) |
| **Week 4** | You can answer a teammate's "how do I use this?" question without checking docs | You're ready to onboard the next person |

If something feels off at any week, run `/check-setup` first — most surprises trace back to a config drift it catches. For symptoms it doesn't catch, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## How updates flow

You'll keep your fork in sync with the team copy over time. Two common situations:

**The team owner shipped a new command and you want it:**

```
cd cs-repo
git fetch upstream
git merge upstream/main
```

That's it. The new command is now in your fork too.

**You wrote a change you think the team would benefit from:**

1. In your repo, just describe the change to Claude — it creates a branch, makes the edit, commits, and pushes
2. Claude prints a GitHub link to open the PR
3. Click the link → fill in the PR template → click "Create pull request"
4. **Important:** the PR should target the team owner's repo, not your own fork. GitHub's UI will ask which repo you're proposing the change to — pick the team repo (the upstream)
5. The team owner reviews and merges (or asks for changes)
6. Once merged, pull the change back into your fork with the `git fetch upstream && git merge upstream/main` flow above

USER_GUIDE.md's "GitHub 101" section has more detail with screenshots if any of this feels foreign.

---

## Trouble?

| Symptom | Fix |
|---|---|
| `/check-setup` reports MCP failures | claude.ai → Settings → Integrations → reconnect the failing one (Gmail/Calendar/Drive share a Google login — if one fails, reconnect all three) |
| `/check-setup` reports Intercom ID mismatch | Your `~/.claude/CLAUDE.md` has the wrong ID. Re-do Step 3 of SETUP.md to find the correct one and update the file |
| Commands like `/daily` don't appear in Claude | You opened Claude in the wrong folder. Close it, run `cd cs-repo` first, then `claude` |
| `git clone` says "permission denied" | You're cloning from a URL that needs a key. Use the `https://` URL, not `git@github.com:`, unless you've set up SSH keys |
| `pip3 install` complains about Python version | Type `python3 --version` — if you get an error, Python isn't installed. Mac: install via [python.org](https://www.python.org/downloads/) |
| Anything else | First check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — symptom-grouped recovery guide. If your symptom isn't there, ask the team owner with the diagnostic info that doc requests |

---

## Inviting a teammate (owner only)

If you're the owner of the canonical repo and want to bring on a new teammate:

1. Add their GitHub username as a collaborator (only needed if you want them to PR directly to your repo without forking — usually not required, since fork-based PRs work without collaborator status)
2. Send them this file (`TEAM_SETUP.md`) and ask them to follow it
3. After they finish, ask them to share their `/check-setup` output as a sanity check
4. Once they've run `/daily` successfully, they're production-ready

The fork-based flow scales to any number of teammates — every teammate has their own fork, opens PRs against your canonical repo, and pulls your merges back via `git fetch upstream`.
