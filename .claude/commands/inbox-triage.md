---
description: Morning Gmail triage — categorize overnight email into Respond / FYI / Escalation / Customer Signal, surface action items, and draft replies on request (drafts only, never sends)
allowed-tools: Read mcp__claude_ai_Gmail__search_threads mcp__claude_ai_Gmail__get_thread mcp__claude_ai_Gmail__create_draft
---

Read `CLAUDE.md` from this repo before starting.

Take the overnight Gmail pile and turn it into a triaged action list. The goal: in 60 seconds you know what needs a reply today, what just needs to be filed, what's a customer risk signal, and what should be escalated to someone else on the team.

**Default mode is read-only.** Any reply drafts go through the draft-before-create pattern and are NEVER sent without explicit approval.

---

## Step 1 — Set the window

Ask if not obvious from context:

> "Triage range? Default is `newer_than:1d -in:draft -category:promotions -category:social` from your last reading session. Say 'since Friday' or 'last 4 hours' to widen/narrow."

Translate the requested window into a Gmail query. Always exclude promotions and social. Always exclude drafts (don't triage things I haven't sent yet).

---

## Step 2 — Pull and categorize

Run `search_threads` with the computed window. For each thread, classify into exactly one bucket:

### 🔴 Respond today
Threads where I am the most recent expected reply. Heuristics:
- Customer sent a question, I haven't replied
- Internal teammate explicitly asked me ("[your name], can you...")
- Action item explicitly assigned to me in a Read.ai follow-up email
- Reply needed to unblock a meeting on today's calendar

### 🟡 Customer signal (no reply required, but pay attention)
- Customer mentioned a competitor by name
- Customer mentioned a new plant, location, region, or volume increase (expansion signal)
- Customer complained about a feature or workflow (risk signal)
- Read.ai meeting report with action items NOT assigned to me but relevant to a customer I own
- Renewal/contract language in the subject or body

### 🟢 FYI / file and move on
- Notifications (Asana, Shortcut, GitHub, Slack digests)
- Newsletters and industry digests
- Internal CCs where I'm not expected to act
- Already-resolved threads (someone else replied after I was CC'd)

### 🟣 Escalate / loop someone in
- Bug reports that should become Shortcut tickets (suggest `/escalate <conversation-url>`)
- Onboarding blockers that need CS Eng attention (suggest `/story-CSEng`)
- Customer asks tied to a specific teammate's account (name the teammate)

---

## Step 3 — Present the triage view

```
## Inbox Triage — <Today's Date>, <range>

**Pulled N threads in <range>**

### 🔴 Respond today (M)
1. [Sender · Subject] — one-line summary of what they need. Last reply: [who, when]
   → Suggested action: [draft reply / forward to X / schedule call]
2. ...

### 🟣 Escalate (M)
1. [Sender · Subject] — what's needed and who should own it
   → Suggested action: `/escalate <url>` or `/story-CSEng`
2. ...

### 🟡 Customer signal (M)
1. [Customer] — [signal type: competitor / expansion / risk / renewal] — one-line context
   → Suggested action: log to /at-risk / /expansion / /follow-up / open `/customer <name>`
2. ...

### 🟢 FYI (M, collapsed)
[Sender count by domain — "5 from Asana notifications, 3 from GitHub, 2 from industry newsletters"]
[Do NOT list every FYI item — just the volume]

---

**Top picks for the next hour:**
1. <Most time-sensitive 🔴 item>
2. <Most valuable 🟡 signal>
3. <Most overdue escalation>
```

---

## Step 4 — Offer drafts (optional, opt-in)

After the triage view, ask:

> "Want me to draft replies for any of the 🔴 items? Tell me which numbers, or say 'all' / 'skip'."

If approved:
- Draft each requested reply using the existing thread context
- Present every draft inline in one block, numbered to match
- Wait for explicit "send all" / "send 1, 2, 4" / "edit #3 first"
- NEVER auto-send. NEVER send without per-draft approval
- Use Gmail `create_draft` to save into Drafts folder (does not send) — only call `send_message` after the user types an explicit send command

---

## Rules

- **Never send email without explicit approval per draft** (matches `/follow-up`)
- Never categorize a thread you couldn't actually read — if the body is too long or truncated, say so and put it in Respond Today by default (safer to over-prioritize)
- For 🟡 customer signals, never invent a signal — quote the trigger phrase (e.g. "mentioned competitor '[COMPETITOR_X]' in body")
- For 🟣 escalations, never auto-create the Shortcut ticket; always suggest the command and let the user run it
- The 🟢 FYI bucket is summarized in aggregate, not listed individually — listing 30 FYI items defeats the point of triage
- All times in your local time zone (per `~/.claude/CLAUDE.md`)
- If Gmail MCP is unavailable, say so and stop

---

## Example

```
> /inbox-triage

## Inbox Triage — Mon, May 26, since Friday 5/23 EOD

**Pulled 47 threads.**

### 🔴 Respond today (3)
1. [CONTACT_NAME] @ [CUSTOMER_A] · "Re: drive time averages" — asking how to compute avg drive-to-plant for the cubic-yards spreadsheet. Last reply: [TEAMMATE_1] Sat 5/24 morning
   → Draft a quick reply explaining the dispatch calc.
2. [MANAGER_NAME] · "Re: [TEAMMATE_2] Day 1 agenda" — wants confirmation Intercom invite is sent before Tue 5/26
   → Confirm yes (already sent Fri).
3. [CONTACT_NAME] · "[CUSTOMER_B] integration sync" — proposes Tue 1pm MT for a follow-up
   → Accept or counter-propose.

### 🟣 Escalate (1)
1. [CUSTOMER_C] · "[PRODUCT] quote field showing wrong total" — bug, screenshot attached
   → Suggested: `/escalate <thread-url>` to file a Shortcut ticket for the quote-engine team

### 🟡 Customer signal (2)
1. [CUSTOMER_D] ([CONTACT_NAME]) — expansion signal: "we're spinning up a 4th plant in [CITY] Q3" (body, 2nd paragraph)
   → Worth opening `/customer [CUSTOMER_D]` and noting in `/expansion`
2. [CUSTOMER_E] ([CONTACT_NAME]) — competitor mention: "evaluating [COMPETITOR_X] for the East coast contracts"
   → Worth flagging in `/at-risk` triage

### 🟢 FYI (41)
- Asana notifications: 14
- GitHub: 11
- Industry digests: 8
- Internal CCs (no action): 8

---

**Top picks for the next hour:**
1. Reply to [CONTACT_NAME]'s drive-time question (unblocks [TEAMMATE_1]'s onboarding work)
2. File the [CUSTOMER_C] bug as a Shortcut ticket
3. Note the [CUSTOMER_D] expansion signal before it gets buried

Want me to draft replies for any of the 🔴 items?
```
