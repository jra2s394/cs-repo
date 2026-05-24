---
description: Fuzzy customer lookup — find a customer across Asana, Shortcut, Intercom, and Gmail when you don't know the exact spelling
---

Read `CLAUDE.md` from this repo before starting.

When I give you a partial name, misspelling, or contact's first name, find the canonical customer record across every system so I can run `/customer`, `/at-risk`, `/qbr`, etc. without guessing the exact spelling.

This is read-only. Never create, update, or comment on anything.

---

## Step 1 — Get the search term

Ask: "What customer? Give me anything — partial name, misspelling, contact name, domain — I'll find it."

Accept anything: `"hi-grade"`, `"hi grade"`, `"higrade"`, `"hollingshead"`, `"hi-grade.com"`, etc.

---

## Step 2 — Search all sources in parallel

Run these in parallel — don't block one on another.

**Intercom:**
- `search_companies` by `name` containing the term (case-insensitive)
- `search_contacts` by `name` OR `email` containing the term
- For each hit, capture: company name, contact name(s), conversation count, last contact date

**Asana:**
- `search_tasks` for tasks/projects with the term in the name
- For each hit, capture: project name, task name, status, assignee

**Shortcut:**
- `stories-search` with the term as `query`
- `epics-search` with the term as `query`
- For each hit, capture: story/epic id, title, state, owner

**Gmail:**
- `search_threads` with the term across `from`, `to`, and `subject` for the last 90 days
- Capture: senders/recipients (deduplicate), thread count, most recent date

---

## Step 3 — Cluster the matches

Group results into **candidate customers**. A candidate is a single account — even if the spelling varies across systems. Use these signals to merge:

- Same email domain → same candidate
- Substring match in company name (e.g. "Hi-Grade", "Hi Grade", "Higrade Concrete") → same candidate
- Same Intercom company referenced from multiple systems → same candidate

For each candidate, show:

```
### [Canonical Name]   (confidence: high | medium | low)
- **Domains:** [list of email domains seen]
- **Aliases:** [other spellings seen across systems]
- **Intercom:** [company id, contact count, last contact date]
- **Asana:** [project name(s), open task count]
- **Shortcut:** [open story count, latest story id]
- **Gmail:** [thread count last 90d, primary contacts]
- **Next action:** Run `/customer "<canonical name>"` for a full snapshot
```

**Confidence rubric:**
- 🟢 **high** — name match across 3+ systems OR exact match in 2 systems
- 🟡 **medium** — match in 2 systems OR strong partial match in 1
- 🔴 **low** — single weak match; might be the wrong customer

---

## Step 4 — Recommend

After listing candidates:

- If exactly **one high-confidence match**: tell me the canonical name and suggest `/customer "<name>"`
- If multiple candidates: present them ranked by confidence; ask which one I meant
- If **zero results**: say so explicitly — don't invent. Suggest broader search terms (try just the first 3 letters, or the contact's last name)

---

## Rules

- Read-only — no Intercom company creation, no Asana task creation, no comments
- Never claim a match without showing the data that supports it
- If a system is unreachable, name it and continue with what's available — note the gap in the output
- Confidence labels are part of the contract: do not upgrade a match without the supporting signals
- All times in Mountain Time

---

## Example

```
> /customer-search hollingshead

### Hi-Grade Concrete   (confidence: 🟢 high)
- **Domains:** hi-grade.com
- **Aliases:** "Hi-Grade", "Hi Grade Concrete", "Higrade"
- **Intercom:** company id 12345 · 4 contacts · last contact 2026-05-22
- **Asana:** "Hi-Grade Onboarding" · 3 open tasks
- **Shortcut:** 1 open story (sc-4521)
- **Gmail:** 14 threads in last 90 days · Geoff Hollingshead, Garrett Hollingshead
- **Next action:** `/customer "Hi-Grade Concrete"`

That's the only match. Want me to run /customer on it?
```
