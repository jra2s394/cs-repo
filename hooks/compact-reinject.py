#!/usr/bin/env python3
"""Re-inject critical Slabstack CS ops rules during context compaction.

Fires on PreCompact and injects the most violation-prone rules from
CLAUDE.md into the compacted summary so they survive the context window.
"""
import sys
import json

output = {
    "hookSpecificOutput": {
        "hookEventName": "PreCompact",
        "additionalContext": (
            "=== SLABSTACK CS OPS — CRITICAL RULES (re-injected at compaction) ===\n\n"
            "1. DRAFT-BEFORE-CREATE (no exceptions):\n"
            "   Never publish, post, send, or create anything in Intercom, Asana,\n"
            "   Shortcut, Slack, or any external system without explicit approval.\n"
            "   Process: draft inline → present to user → wait for 'looks good /\n"
            "   post it / create it' → then act.\n\n"
            "2. ACCURACY — NO HALLUCINATION:\n"
            "   Every number must come from a live tool call, not an estimate.\n"
            "   Never claim a meeting happened without a calendar event confirming it.\n"
            "   Never claim a go-live or milestone without explicit inbox confirmation.\n"
            "   If status is unclear, flag 🔴 'status unclear — needs confirmation.'\n\n"
            "3. MOUNTAIN TIME:\n"
            "   Use ZoneInfo('<your IANA TZ from ~/.claude/CLAUDE.md>') — never hardcode a UTC offset.\n\n"
            "4. INTERCOM API CONSTRAINTS:\n"
            "   - search_conversations() requires at least one filter parameter.\n"
            "     EXCEPTION: /intercom-yeartodate uses an unbounded pull (no date filter)\n"
            "     to retrieve all-time totals — this is intentional for that command only.\n"
            "   - Paginate every query with starting_after until no more pages.\n"
            "   - Admin IDs: defined in CLAUDE.md under 'Intercom admin IDs' — update that table with your team's IDs.\n\n"
            "5. DOCX REPORT GENERATION:\n"
            "   Write JSON to data/outputs/, then run node reports/intercom-<type>.js <path>.\n"
            "   All dataTable columnWidths must sum to exactly 9360.\n"
            "======================================================================"
        ),
    }
}
print(json.dumps(output))
sys.exit(0)
