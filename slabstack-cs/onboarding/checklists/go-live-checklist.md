# Go-Live Checklist

Pre-go-live verification. Run this 5 business days before the customer's announced go-live date. If anything is 🔴, hold the go-live until resolved.

---

## Customer

**Customer:** ___________________
**Target go-live date:** ___________________
**CSM:** ___________________
**Date of this review:** ___________________

---

## 1. Configuration

- [ ] Mix designs entered and validated against a real quote
- [ ] Price list current (no placeholder values)
- [ ] Customer list imported with no duplicates
- [ ] User roles set for every internal user who needs access
- [ ] Email templates customized with the customer's branding
- [ ] At least one quote sent and viewed by a real customer-side recipient

**Status:** 🟢 / 🟡 / 🔴

---

## 2. Integrations

- [ ] Dispatch integration (if in scope) tested end-to-end with real data
- [ ] Sync direction confirmed and documented
- [ ] Customer's IT / dispatch lead has confirmed the integration on their side
- [ ] Fallback plan documented if the integration drops

**Status:** 🟢 / 🟡 / 🔴

---

## 3. People

- [ ] Every internal user has logged in at least 3 times
- [ ] At least 2 users can independently create a quote without help
- [ ] At least 1 user can independently create a project without help
- [ ] Customer-side champion identified by name
- [ ] Backup contact identified if the champion is unavailable

**Status:** 🟢 / 🟡 / 🔴

---

## 4. Support Path

- [ ] Customer knows how to reach Intercom support
- [ ] CSM contact info shared (email + phone)
- [ ] Escalation path explained ("for urgent issues...")
- [ ] First 30-day check-in scheduled

**Status:** 🟢 / 🟡 / 🔴

---

## 5. Open Issues

Run `/go-live <customer-name>` to pull a live cross-system check.

- [ ] No P0/P1 Shortcut stories open
- [ ] No critical Asana tasks open against this customer
- [ ] No unresolved Intercom conversations
- [ ] AE commitments from the deal — all delivered or explicitly deferred with customer agreement

**Status:** 🟢 / 🟡 / 🔴

---

## 6. Communication

- [ ] Go-live announcement email drafted for customer (use `/follow-up` template style)
- [ ] Internal Slack post drafted for #customer-success channel
- [ ] CSM is available for go-live day (no PTO conflict)
- [ ] Backup CSM identified if primary is unavailable

**Status:** 🟢 / 🟡 / 🔴

---

## Final Verdict

| All sections green? | Action |
|---|---|
| Yes | Proceed with go-live; send announcement |
| One or more yellow | CSM judgment call; document the yellow and the mitigation |
| Any red | **Hold go-live.** Send hold note to customer with new target date |

**Final decision:** ☐ GO   ☐ HOLD

**Signed off by:** ___________________
**Date:** ___________________
