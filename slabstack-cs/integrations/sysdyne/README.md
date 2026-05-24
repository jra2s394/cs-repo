# Sysdyne Integration

Slabstack integrates with Sysdyne to sync dispatch, order, and delivery data — eliminating double entry and keeping project records current in real time.

---

## Overview

**What it does:**
- Pulls order and delivery data from Sysdyne into Slabstack projects
- Keeps project status in sync with dispatch activity
- Eliminates manual data entry between systems

**Who it's for:**
Ready-mix and concrete producers using Sysdyne as their dispatch/ERP system who want Slabstack to serve as their customer-facing project and quote management layer.

---

## Prerequisites

Before starting setup, confirm:

- [ ] Active Sysdyne account with API access enabled
- [ ] Slabstack account on a plan that includes integrations
- [ ] Admin access to both systems

---

## Setup Guide

### Step 1 — Enable API Access in Sysdyne
Contact your Sysdyne account rep to enable API access for your account. They will provide:
- API endpoint URL
- API key or credentials

### Step 2 — Connect in Slabstack
1. Navigate to **Settings → Integrations**
2. Select **Sysdyne**
3. Enter your API endpoint and credentials
4. Click **Test Connection** — confirm green status
5. Click **Save**

### Step 3 — Configure Data Sync
1. Select which data types to sync (orders, deliveries, customers)
2. Set sync frequency (real-time or scheduled)
3. Map Sysdyne fields to Slabstack fields
4. Click **Activate**

---

## Data Flow

| Sysdyne → Slabstack | Frequency |
|--------------------|-----------|
| New orders | Real-time |
| Delivery status updates | Real-time |
| Customer records | Daily sync |

---

## Troubleshooting

**Connection failed on setup**
- Verify API credentials are correct
- Confirm API access is enabled on Sysdyne side
- Check that your IP is not blocked by Sysdyne's firewall

**Data not syncing**
- Check integration status under Settings → Integrations
- Confirm sync is set to Active
- Review error logs for specific field mapping issues

**Duplicate records appearing**
- This usually means a customer exists in both systems with different IDs
- Use the deduplication tool under Settings → Integrations → Sysdyne → Data Health

---

## FAQ

**Q: Will existing Sysdyne data import into Slabstack?**
A: Historical data can be imported as a one-time migration. Contact your CSM to initiate.

**Q: What happens if Sysdyne is down?**
A: Slabstack queues the sync and processes it when Sysdyne comes back online. No data is lost.

**Q: Can we control which customers sync?**
A: Yes — you can filter by customer type, region, or tag in the sync settings.
