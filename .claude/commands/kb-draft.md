---
description: Draft a knowledge base article for Intercom — pulls from conversation history, drafts for review, publishes only after approval
---

Read `CLAUDE.md` from this repo before starting.

Draft a new Intercom knowledge base article based on a support topic or conversation.

---

## Step 1 — Get the topic

Ask me: "What's the article about? You can give me a topic, paste a conversation ID, or describe the question customers keep asking."

If I give a conversation ID, use `get_conversation` to read the full thread and understand the customer's issue and how it was resolved.

If I give a topic, search Intercom conversations for recent examples of that question to ground the article in real customer language.

---

## Step 2 — Check for an existing article

Search the Intercom knowledge base for any existing article on this topic using `search_articles`.

If one exists, show it to me and ask if I want to update it instead of creating a new one.

---

## Step 3 — Draft the article

Write the article following the content standards from CLAUDE.md:

- **Title** — lead with the outcome the customer is trying to achieve, not the feature name
- **Intro** — one sentence, what this article helps the customer do
- **Body** — numbered steps for procedures, bullets for reference lists
- **Short sentences** — customers are in the field, often on mobile
- **Next steps** — one or two related articles or what to do if this didn't help

Use this structure:

```
# [Title]

[One-sentence intro]

## Steps

1. [Step]
2. [Step]
3. [Step]

## Related

- [Article name]
- [Article name]

Still need help? [Contact support link or message]
```

Present the full draft in the conversation and ask: "Does this look right? Any changes before I publish to Intercom?"

---

## Step 4 — Publish only after approval

Wait for explicit approval before publishing.

After publishing, share the Intercom article URL.

If I ask to save locally instead, write the article to `slabstack-cs/kb-articles/[slug].md`.

If any MCP tool is unavailable, tell me which one and stop.
