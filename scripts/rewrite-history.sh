#!/usr/bin/env bash
#
# rewrite-history.sh — destructive history rewrite for cs-repo.
#
# Purpose
#   Scrub identity correlation and content leaks from the git history of this
#   repo. Specifically:
#
#     1. Rewrite EVERY commit's author/committer email to a single chosen
#        address (drops the link between any historical work / personal
#        identities visible in `git log --pretty=fuller`).
#     2. Replace customer / contact / competitor / identity strings — defined
#        in REPL_FILE below — in BOTH commit messages AND historical file
#        contents, so the leaks are gone from `git log` (messages), from
#        `git log -p` (patches), and from `git show <sha>:<path>` (blobs).
#
# Read scripts/REWRITE-HISTORY.md before running. This action is destructive:
# it rewrites every commit SHA, breaks every existing clone, and forces every
# fork or local clone to re-clone after the force-push.
#
# DO NOT run this from CI. DO NOT run it on the working repo without a backup.
# This script is meant to be invoked by hand, intentionally, by the repo owner.

set -euo pipefail

# ----------------------------------------------------------------------------
# Required configuration — fill in before running.
# ----------------------------------------------------------------------------

# Single email that every commit (author and committer) will be rewritten to.
# Pick the one you want to be canonical going forward.
CHOSEN_EMAIL=""

# Display name to pair with CHOSEN_EMAIL on every rewritten commit.
CHOSEN_NAME=""

# ----------------------------------------------------------------------------
# Sanity checks
# ----------------------------------------------------------------------------

if [[ -z "$CHOSEN_EMAIL" || -z "$CHOSEN_NAME" ]]; then
  cat >&2 <<'EOF'
ERROR: edit this script and set CHOSEN_EMAIL and CHOSEN_NAME at the top.

  CHOSEN_EMAIL  — the email every commit will be rewritten to use
  CHOSEN_NAME   — the display name paired with that email

After filling those in, re-run.
EOF
  exit 1
fi

if ! command -v git-filter-repo >/dev/null 2>&1 && ! git filter-repo --help >/dev/null 2>&1; then
  cat >&2 <<'EOF'
ERROR: git-filter-repo is not installed.

  macOS:    brew install git-filter-repo
  pip:      pip install git-filter-repo

Re-run once it's on PATH.
EOF
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "ERROR: not inside a git repository." >&2
  exit 1
fi

cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is dirty. Commit, stash, or clean before running." >&2
  exit 1
fi

# Confirm before doing anything destructive.
cat <<EOF

About to rewrite history in: $REPO_ROOT

  - All commits will be re-authored as:  $CHOSEN_NAME <$CHOSEN_EMAIL>
  - Commit messages: 'protonmail' -> 'protonmail'
  - Commit messages + historical file contents: customer / competitor / personal
    names from REPLACEMENTS will be substituted with placeholders.

This is destructive. Every commit SHA in this repo will change. All existing
clones must be re-cloned after the force-push.

Type the word REWRITE to continue (anything else aborts):
EOF
read -r CONFIRM
if [[ "$CONFIRM" != "REWRITE" ]]; then
  echo "Aborted."
  exit 1
fi

# ----------------------------------------------------------------------------
# Build the replacements file.
#
# Format (one rule per line, no comment syntax):
#   <literal-string>==><replacement>
#
# git-filter-repo applies these to both commit messages AND file blobs.
# Lines starting with `#` are NOT comments — filter-repo treats them as
# literal patterns and (without `==>`) would replace them with ***REMOVED***.
# So the heredoc below contains only rules + blank separators; all
# explanation lives in the shell comments above each block.
#
# Order matters: filter-repo applies rules top-to-bottom against each blob
# and commit message. Put the most specific (longest) match before any
# shorter substring that would also match — otherwise the shorter rule eats
# the prefix and the longer rule never fires.
# ----------------------------------------------------------------------------

REPL_FILE="$(mktemp -t cs-repo-rewrite-replacements.XXXXXX)"
trap 'rm -f "$REPL_FILE"' EXIT

# Block 1: protonmail typo. The full-email rule runs first so the substring
# rule below doesn't half-rewrite it. Catches PR #23's commit body and the
# PR #39 merge commit's `Co-authored-by:` trailer.
#
# Block 2: absolute filesystem paths. Longest-first so the repo-root rule
# fires before the home-dir catch-all. Catches `[HOME]/...` and
# `[HOME]/...` (the latter still lives in test_session_to_obsidian.py
# history before this PR cleans it).
#
# Block 3: customers. Case + possessive variants matter because filter-repo
# matches literal substrings, case-sensitive. PR #30 (94101b1) has
# "[CUSTOMER_A] deep-dive", "[CUSTOMER_A]'s", and "[customer_a].com" — each needs its
# own rule.
#
# Block 4-7: competitors, contacts, internal team names, identity, external
# IDs. The team-name rules (`[TEAM_OTHER]`, `[TEAM_PRIMARY]`) are new in
# round 2 — both appear in PR #30.

cat > "$REPL_FILE" <<'EOF'
tripp.arnold@protonmail.com==>tripp.arnold@protonmail.com
protonmail==>protonmail

[REPO_ROOT]==>[REPO_ROOT]
[HOME]/==>[HOME]/
[HOME]/==>[HOME]/

[CUSTOMER_A]'s==>[CUSTOMER_A]'s
[CUSTOMER_A]==>[CUSTOMER_A]
[customer_a].com==>[customer_a].com
[customer_a]==>[customer_a]
[CUSTOMER_B]==>[CUSTOMER_B]
[CUSTOMER_C]==>[CUSTOMER_C]
[CUSTOMER_D]==>[CUSTOMER_D]
[CUSTOMER_D]==>[CUSTOMER_D]
[CUSTOMER_D]==>[CUSTOMER_D]
[CUSTOMER_E]==>[CUSTOMER_E]
[CUSTOMER_F]==>[CUSTOMER_F]
[CUSTOMER_F]==>[CUSTOMER_F]
[CUSTOMER_G]==>[CUSTOMER_G]

[COMPETITOR_X]==>[COMPETITOR_X]

[CONTACT_A]==>[CONTACT_A]
[CONTACT_B]==>[CONTACT_B]
[CONTACT_B]==>[CONTACT_B]
[CONTACT_C]==>[CONTACT_C]
[CONTACT_D]==>[CONTACT_D]
[CONTACT_E]==>[CONTACT_E]
[CONTACT_F]==>[CONTACT_F]

[TEAM_OTHER]==>[TEAM_OTHER]
[TEAM_PRIMARY]==>[TEAM_PRIMARY]

[YOUR_NAME]==>[YOUR_NAME]
[YOUR_EMAIL]==>[YOUR_EMAIL]
contact@customer.com==>contact@customer.com
contact@customer.com==>contact@customer.com

[ASANA_TEAM_GID]==>[ASANA_TEAM_GID]
[DRIVE_PARENT_FOLDER_ID]==>[DRIVE_PARENT_FOLDER_ID]
EOF

# ----------------------------------------------------------------------------
# Build the mailmap.
#
# git-filter-repo --mailmap takes a standard mailmap file. We map every
# historical author/committer identity to (CHOSEN_NAME, CHOSEN_EMAIL).
# Use `<>` as the source-match wildcard so every author identity in history
# gets rewritten to the canonical one.
# ----------------------------------------------------------------------------

MAILMAP_FILE="$(mktemp -t cs-repo-rewrite-mailmap.XXXXXX)"
trap 'rm -f "$REPL_FILE" "$MAILMAP_FILE"' EXIT

# List every distinct (name, email) pair currently in history and map each one
# to (CHOSEN_NAME, CHOSEN_EMAIL). This is more reliable than wildcards because
# different versions of git-filter-repo treat the mailmap format slightly
# differently.
while IFS=$'\t' read -r name email; do
  printf '%s <%s> %s <%s>\n' \
    "$CHOSEN_NAME" "$CHOSEN_EMAIL" "$name" "$email" >> "$MAILMAP_FILE"
done < <(git log --all --format='%aN%x09%aE' | sort -u)

# Also remap committer identities (separate stream — same pairs, but produced
# from %cN/%cE so we catch identities that only appear as committer).
while IFS=$'\t' read -r name email; do
  printf '%s <%s> %s <%s>\n' \
    "$CHOSEN_NAME" "$CHOSEN_EMAIL" "$name" "$email" >> "$MAILMAP_FILE"
done < <(git log --all --format='%cN%x09%cE' | sort -u)

# ----------------------------------------------------------------------------
# Run filter-repo.
# ----------------------------------------------------------------------------

# --force is required because git-filter-repo refuses to operate on a repo
# with prior history by default; this is intentional and exactly why the
# script prompts for REWRITE confirmation above.

git filter-repo \
  --force \
  --mailmap "$MAILMAP_FILE" \
  --replace-text "$REPL_FILE" \
  --replace-message "$REPL_FILE"

cat <<EOF

History rewrite complete.

NEXT STEPS — read scripts/REWRITE-HISTORY.md before doing any of these:

  1. Inspect the new history locally — check BOTH messages AND patches:
        git log --pretty='%h %an <%ae> %s' | head -40

        # Patches (blobs) — should each find nothing:
        git log -p --all -S '[CUSTOMER_A]'
        git log -p --all -S '[TEAM_OTHER]'
        git log -p --all -S '[TEAM_PRIMARY]'
        git log -p --all -S '/Users/tripp'

        # Commit messages — should each find nothing:
        git log --all --format=%B | grep -i 'protonmail'
        git log --all --format=%B | grep -F '[CUSTOMER_A]'
        git log --all --format=%B | grep -F 'tarnold@sysdyne'

        # Identities — should print exactly ONE line:
        git log --all --pretty='%an <%ae>%n%cn <%ce>' | sort -u

  2. git-filter-repo strips the origin remote intentionally. Re-add it:
        git remote add origin <your-remote-url>

  3. Force-push every branch and tag. THIS BREAKS EVERY EXISTING CLONE:
        git push --force --all origin
        git push --force --tags origin

  4. Tell every collaborator they MUST re-clone. Their old clones will not
     fast-forward against the rewritten history.

  5. Old PRs and issues keep their numbers. Old commit SHAs in PR descriptions
     and links will 404.
EOF
