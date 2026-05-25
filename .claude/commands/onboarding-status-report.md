---
description: Generate a customer-facing onboarding status report — email, calendar, Asana, Intercom
---

# Onboarding Status Report

Generate a branded `.docx` status report for a customer's active onboarding, pulling live data from Gmail, Google Calendar, Asana, and Intercom.

## Steps

### 1. Collect customer info

Ask for (or confirm from context):
- **Customer name** (e.g. "Acme")
- **Customer email domain or contact email** — used for Gmail search
- **Asana project name** — often "{Customer} Onboarding"; confirm if unsure

---

### 2. Pull live data (run all four in parallel)

**Gmail** — `search_threads`
- Query: `(from:{customer-domain} OR to:{customer-domain}) newer_than:30d -in:draft`
- Pull up to 20 threads. For each: date, subject, sender, direction (inbound = from customer, outbound = from me).
- Flag any thread with no reply in 5+ days as a follow-up needed item.

**Google Calendar** — `list_events`
- Past 14 days: `startTime` = 14 days ago, `endTime` = today (Mountain Time ISO 8601)
- Next 30 days: `startTime` = today, `endTime` = 30 days from now
- Filter to events containing the customer name. Record: date, time (MT), title, attendees.

**Asana** — `search_tasks` + `get_tasks` (or `search_objects` for the project)
- Locate the customer's onboarding Asana project by name.
- Pull all tasks: name, section, assignee, due_date, completed.
- Identify milestone tasks (sections like "Go-Live", "Training", "Integration Setup").
- Derive: start date (earliest task or project start), target go-live (go-live milestone due date).

**Intercom** — `search_conversations`
- Search by customer name/domain, last 30 days.
- Pull open conversations: subject/first line, date, status.
- Flag any open conversation > 5 days old as an open item.

---

### 3. Build the metrics JSON

Assemble all data, then save to `data/outputs/onboarding-status-{customerSlug}-{YYYY-MM-DD}.json`.

**Required fields:**
```json
{
  "customer":     "Acme",
  "customerSlug": "Acme",
  "generated":    "June 2, 2026",
  "preparedBy":   "[Your Name]",
  "dateRange":    "May 1 – June 2, 2026",
  "kpis": [
    { "label": "Days Active",    "value": "32" },
    { "label": "Tasks Complete", "value": "18 / 24", "delta": "+3 this week" },
    { "label": "Go-Live Target", "value": "June 15" },
    { "label": "Open Items",     "value": "2",       "delta": null }
  ],
  "contactInfo": [
    { "name": "[Your Name]",  "role": "CSM — [Product]", "email": "you@yourcompany.com",              "phone": "" },
    { "name": "[Contact Name]", "role": "Project Lead",  "email": "contact@customer.com",             "phone": "555-1234" }
  ],
  "timeline": {
    "startDate":        "May 1, 2026",
    "targetGoLive":     "June 15, 2026",
    "daysInOnboarding": 32,
    "daysToGoLive":     13,
    "goLiveStatus":     "On Track"
  },
  "milestones": [
    { "name": "Integration Setup", "date": "May 15, 2026",  "status": "✓ Complete" },
    { "name": "Training Complete", "date": "June 5, 2026",  "status": "In Progress" },
    { "name": "Go-Live",           "date": "June 15, 2026", "status": "Upcoming" }
  ],
  "asanaTasks": [
    { "task": "Configure dispatch integration", "section": "Integration", "assignee": "[Teammate]",   "dueDate": "May 20, 2026", "completed": true },
    { "task": "Conduct admin training",          "section": "Training",    "assignee": "[Your Name]", "dueDate": "June 5, 2026", "completed": false }
  ],
  "recentEmails": [
    { "date": "June 1",  "subject": "Training session recap", "from": "[Your Name]",    "direction": "Outbound" },
    { "date": "May 30",  "subject": "Integration question",   "from": "[Contact Name]", "direction": "Inbound" }
  ],
  "upcomingMeetings": [
    { "date": "June 5", "time": "10:00 AM MT", "title": "Admin Training Session", "attendees": "[Your Name], [Contact A], [Contact B]" }
  ],
  "openItems": [
    { "item": "Confirm go-live date with ops team", "owner": "[Contact Name]", "due": "June 3, 2026", "urgent": false }
  ],
  "methodology": {
    "sources": ["Gmail", "Google Calendar", "Asana", "Intercom"],
    "period":  "May 1 – June 2, 2026"
  }
}
```

**Accuracy rules:**
- Never mark a task complete without Asana confirming `completed: true`.
- Never list a meeting without a calendar event confirming it.
- Flag 🔴 (urgent: true) any open item older than 5 days, any unconfirmed go-live, or any Intercom conversation open > 5 days.
- All times in Mountain Time.

---

### 4. Generate the report

```bash
node reports/onboarding-status.js data/outputs/onboarding-status-{customerSlug}-{YYYY-MM-DD}.json
```

Output: `out/Onboarding_Status_{CustomerSlug}_{Date}.docx`
Auto-copies to `~/Desktop/CS Reports/Onboarding/`.

---

### 5. Google Drive upload (optional)

To convert the CSV companion to a Google Sheet:
1. Read the `.csv` from `out/Onboarding_Status_{CustomerSlug}_{Date}.csv`
2. Call `mcp__claude_ai_Google_Drive__create_file` with:
   - `title`: `Onboarding Status — {Customer} — {Date}`
   - `textContent`: (full CSV content)
   - `contentMimeType`: `text/csv`
   - `parentFolderId`: (the customer's onboarding folder on Drive, if known)

---

## End with

"Report saved to `out/Onboarding_Status_{CustomerSlug}_{Date}.docx` and copied to Desktop. Want me to upload the data to Google Sheets, or tweak anything?"
