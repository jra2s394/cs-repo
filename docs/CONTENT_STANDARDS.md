# Content Standards

Standards for the four content types produced by this repo: knowledge base
articles, onboarding videos, pre-sales docs, integration guides.

Lives in `docs/` rather than CLAUDE.md so it loads only when Claude is
actually drafting content (per the Anthropic best-practices guidance:
"For domain knowledge or workflows that are only relevant sometimes,
use [skills](https://code.claude.com/docs/en/skills) instead. Claude
loads them on demand without bloating every conversation.").

Until we migrate to skills, Claude reads this file when invoked by a
command that produces content (`/kb-draft`, `/onboarding-status-report`,
etc.) by Read-tool reference.

---

## Knowledge Base Articles (Intercom)

- Lead with the outcome the customer is trying to achieve, not the feature name.
- Use numbered steps for procedures; bullets for reference lists.
- Keep sentences short — Slabstack customers are in the field, often on mobile.
- Every article needs: a clear title, a one-sentence intro, step-by-step body, and a "next steps" or related articles section.
- Tag articles by product area and customer segment before publishing.

## Onboarding Videos

- Script before recording. Draft the script in conversation for review first.
- Each video covers exactly one workflow — no multi-topic videos.
- Include a written companion article in Intercom for every video.

## Pre-Sales Docs

- Audience is the buyer, not the end user. Lead with business outcomes and ROI, not feature lists.
- Use Slabstack's concrete industry terminology (mix designs, batch tickets, plant operations, etc.).
- Confirm the target persona and deal stage before drafting.

## Integration Guides

- Always specify the third-party system by name and version if known.
- Structure: Overview → Prerequisites → Step-by-step setup → Troubleshooting → Support contact.
- Flag any steps that require IT or admin access so the customer can prepare.
