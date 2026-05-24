# Integration Documentation

Technical and workflow documentation for all Slabstack integrations. Each integration has its own folder with setup guides, troubleshooting, and FAQs.

---

## Integration Directory

| Integration | Type | Status | Folder |
|-------------|------|--------|--------|
| Sysdyne | ERP / Dispatch | ✅ Active | `/sysdyne/` |

---

## How to Use This Section

Each integration folder contains:

- **Overview** — What the integration does and who it's for
- **Setup Guide** — Step-by-step technical configuration
- **Data Flow** — What data moves between systems and when
- **Troubleshooting** — Common errors and how to resolve them
- **FAQ** — Questions from real customers

---

## Adding a New Integration

When a new integration is built, create a new folder following this structure:

```
integrations/
└── [integration-name]/
    ├── README.md          # Overview and quick start
    ├── setup-guide.md     # Step-by-step configuration
    ├── data-flow.md       # What syncs, when, and how
    ├── troubleshooting.md # Common issues and fixes
    └── faq.md             # Customer questions
```
