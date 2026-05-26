# MCP Precision Notes

Per-MCP gotchas and exact-call patterns Claude needs to get queries right.
Lives in `docs/` rather than CLAUDE.md so it loads only when relevant
(see [CONTENT_STANDARDS.md](CONTENT_STANDARDS.md) for the same rationale).

Most of these were learned the hard way — a query returned an empty list
or "result too large" error, the cause was a missing filter or wrong
argument shape, and the fix is now codified here.

---

- **Gmail:** `search_threads` with `is:unread` for unread count. Use `newer_than:1d -in:draft` for last 24h. Use `after:YYYY/MM/DD -in:draft -category:promotions -category:social` for date ranges.

- **Calendar:** `list_events` requires explicit ISO 8601 `startTime` and `endTime` bounding the full day range (e.g., `2026-05-15T00:00:00` to `2026-05-15T23:59:59`).

- **Intercom:** `search_conversations()` requires at least one filter parameter — use `created_at >= timestamp`. **Exception:** `/intercom-yeartodate` intentionally makes an unbounded all-time pull to compute workspace totals; that is the only command where no date filter is correct.

- **MCP config:** server entries in `.mcp.json` go under `mcpServers` keyed by name (the *key* is the server name — there is no separate `name` field). Two shapes, by transport: **stdio** uses `command` / `args` / `env` (no `type` needed; this is what our `.mcp.json` Shortcut entry uses); **remote HTTP/SSE** uses `type: "http"` (or `"sse"` / `"streamable-http"`) + `url` + optional `headers`. Mixing shapes (e.g. adding `url` to a stdio entry) silently breaks the server. See <https://code.claude.com/docs/en/mcp> for the full reference, including env-var expansion (`${VAR}` and `${VAR:-default}`).

- **Latency:** calling many MCP servers at once is slow. For testing, use Gmail + Calendar + Asana only.
