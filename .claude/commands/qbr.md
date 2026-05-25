---
description: QBR prep for a customer — pulls a quarter's worth of data from all sources and drafts agenda sections for review before the meeting.
argument-hint: <customer> [quarter]
---

Read `CLAUDE.md` from this repo before starting.

Prepare a QBR (Quarterly Business Review) for a specific customer. Always drafts for review — never creates or sends anything without explicit approval.

> **MCP gotchas across commands:** Asana team-filter noise (sibling-team projects polluting results), Intercom result-too-large errors (`per_page` token budget; `contact_ids` caps at 15), and stale 2023 overdue tasks all have documented fixes in `/health-score`'s Step 1. Read that section first if any MCP query here misbehaves.

---

## Step 1 — Get the customer and quarter

Ask:
1. **Which customer?**
2. **Which quarter?** (e.g., Q2 2026 — defaults to the current quarter if not specified)
3. **Any specific goals for this QBR?** (renewal conversation, expansion, save play — optional)

---

## Step 2 — Pull all data in parallel

Fetch the full quarter's data simultaneously:

**Intercom:**
- All conversations for this customer this quarter
- Count: total, resolved, open
- Topics: group by theme (billing, technical issue, feature request, training)
- Response time: average first response and resolution time
- Any unresolved or escalated issues

**Gmail:**
- All threads with this customer this quarter
- Key milestones mentioned: go-live, training completion, feature adoption
- Any complaints, escalations, or unresolved questions
- Search `from:e.read.ai` for meeting reports with this customer this quarter

**Google Calendar:**
- All meetings with this customer this quarter (count + dates)
- Any upcoming meetings in the next 30 days

**Asana:**
- Tasks completed for this customer this quarter
- Open tasks — overdue, due soon

**Shortcut:**
- Stories opened this quarter related to this customer
- Stories resolved — especially bugs and config tasks
- Any open blockers

---

## Step 3 — Draft the QBR brief

Draft the full QBR prep document in the conversation for review:

```
# QBR Prep — [Customer Name]
## [Quarter] | Prepared [Date]

---

### Attendees (to confirm)
- Customer: [names to invite]
- Slabstack: [CSM + who else]

---

### Quarter in review — usage and support

**Support volume:** [X conversations — up/down from last quarter if known]
**Topics:** [main themes from Intercom + email]
**Resolution rate:** [X% resolved, Y open]
**Escalations:** [any — describe]

---

### Wins to highlight

1. [Specific win — tied to a completed task, resolved issue, or milestone]
2. [Second win]
3. [Third win if available]

Source: [calendar event / sent email / Asana completion / Shortcut story]

---

### Open issues and action items

🔴 [Unresolved issue — age and description]
🟡 [In-progress item — current state]
✅ [Resolved this quarter — brief]

---

### Renewal context

- **Renewal date:** [from customer master if known, else "confirm with Finance"]
- **Contract:** [length / ARR if known]
- **Renewal talking points:** [any flags — expansion opportunity, at-risk signals, price sensitivity from email threads]

---

### Next quarter goals

(To fill in with customer during the meeting)
- [ ]
- [ ]
- [ ]

---

### Agenda (45 min)

| Section | Time | Notes |
|---|---|---|
| Welcome & agenda | 2 min | |
| Quarter in review — usage and adoption | 10 min | [key data points to mention] |
| Value realized — wins | 10 min | [wins from above] |
| Open issues | 5 min | [issues from above] |
| Roadmap preview | 8 min | [confirm with product what to share] |
| Next quarter goals | 8 min | Customer leads |
| Wrap up & next steps | 2 min | |

---

### Pre-QBR checklist

- [ ] Usage data pulled and verified
- [ ] Open support tickets reviewed
- [ ] Wins confirmed with evidence (no hallucinated outcomes)
- [ ] Renewal talking points prepared if within 90 days
- [ ] Attendee list confirmed, agenda sent 48h before
```

Present the draft and ask: "Does this look right? Any sections to adjust before I save it?"

---

## Step 4 — Generate report after approval

Once the draft is approved:

**a) Write the metrics JSON** to `data/outputs/qbr-[customer-slug]-[quarter-slug]-metrics-[YYYY-MM-DD].json`:

```json
{
  "customer":          "[Customer Name]",
  "customerSlug":      "[customer-slug]",
  "quarter":           "[e.g. Q2 2026]",
  "dateRange":         "[e.g. Feb 1 – Apr 30, 2026]",
  "generated":         "[e.g. May 26, 2026]",
  "preparedBy":        "[Your Name from CLAUDE.md]",
  "meetingDate":       "[e.g. May 28, 2026 or null]",
  "attendeesCustomer": "[names or null]",
  "attendeesSlabstack":"[names]",
  "kpis": [
    { "value": "[win count]",    "label": "Quarter Wins",    "delta": null },
    { "value": "[open count]",   "label": "Open Issues",     "delta": "[e.g. 🔴 1 critical or null]" },
    { "value": "[🟢/🟡/🔴]",     "label": "Renewal Status",  "delta": "[e.g. On track]" }
  ],
  "executiveSummary": [
    ["Health",        "[🟢 Green / 🟡 Yellow / 🔴 Red]"],
    ["ARR",           "[from Finance email or customer master — omit if unknown]"],
    ["Renewal Date",  "[date or Confirm with Finance]"],
    ["Meetings",      "[X meetings this quarter]"],
    ["Support Volume","[X conversations]"],
    ["Resolution Rate","[X%]"]
  ],
  "wins": [
    { "win": "[description]", "impact": "[impact]", "source": "[calendar event / email / Asana / Shortcut]" }
  ],
  "openIssues": [
    { "issue": "[description]", "status": "[status]", "owner": "[owner]", "eta": "[date]", "critical": true }
  ],
  "renewal": {
    "date":       "[renewal date or null]",
    "daysOut":    [days as number or null],
    "currentARR": "[ARR or null]",
    "risk":       "[High / Medium / Low or null]",
    "strategy":   "[renewal approach or null]"
  },
  "agenda": [
    ["Welcome & agenda",                    "2 min",  "CSM"],
    ["Quarter in review — usage & adoption","10 min", "CSM"],
    ["Value realized — wins",               "10 min", "CSM"],
    ["Open issues",                         "5 min",  "CSM"],
    ["Roadmap preview",                     "8 min",  "CSM"],
    ["Next quarter goals",                  "8 min",  "Customer"],
    ["Wrap up & next steps",                "2 min",  "Both"]
  ],
  "nextSteps": [
    { "action": "Send QBR recap with action items", "owner": "[Your Name]", "due": "Within 24h" },
    { "action": "Update health score in customer master", "owner": "[Your Name]", "due": "Within 24h" }
  ],
  "methodology": {
    "period":  "[e.g. Feb 1 – Apr 30, 2026]",
    "sources": ["Intercom", "Gmail", "Google Calendar", "Asana", "Shortcut"]
  }
}
```

**b) Build the .docx:**
```bash
node reports/qbr.js data/outputs/qbr-[customer-slug]-[quarter-slug]-metrics-[YYYY-MM-DD].json
```
Output: `out/QBR_[CustomerSlug]_[Quarter]_[Date].docx`
Auto-copies to `~/Desktop/CS Reports/QBR/` if that folder exists (run `bash scripts/setup-desktop.sh` once to create it).

**c) Ask if you want to create Asana tasks for any pre-QBR checklist items.**

Draft any Asana tasks before creating them.

---

## Google Drive upload (optional)

After generating the report, ask: "Want me to upload the QBR data to Google Sheets?"

If yes:
1. Read the `.csv` file from `out/` (same name as the `.docx`, `.csv` extension)
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: "QBR — [Customer] — [Quarter]"
   - `textContent`: the CSV file contents
   - `contentMimeType`: "text/csv"
3. Google Drive auto-converts it to a native Google Sheet. Return the file link.

---

## Rules

- Every win must be sourced (calendar event, sent email, Asana completion, or Shortcut resolution)
- Never claim a meeting happened without a calendar event
- Flag anything unclear with 🔴
- Renewal ARR and contract details must come from Finance data or email — don't estimate
- All times in Mountain Time
- If any MCP tool is unavailable, note it and continue
