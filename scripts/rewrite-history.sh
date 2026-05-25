#!/usr/bin/env bash
#
# rewrite-history.sh — destructive history rewrite for cs-repo.
#
# Purpose
#   Scrub identity correlation and content leaks from the git history of this
#   repo. Specifically:
#
#     1. Rewrite EVERY commit's author/committer email to a single chosen
#        address (drops the link between the user's personal protonmail and
#        their work email).
#     2. Find/replace `prontonmail` -> `protonmail` in commit messages (typo
#        fix for the PR #23 commit body and any other occurrences).
#     3. Replace customer/competitor strings in BOTH commit messages and
#        historical file contents so the leaks are gone from `git log -p` and
#        from `git show <sha>:<path>` too.
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
  - Commit messages: 'prontonmail' -> 'protonmail'
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
# Format (one rule per line):
#   <literal-string>==><replacement>
#
# git-filter-repo applies these to both commit messages AND file blobs.
# Lines starting with `#` are not comments — they're treated as literal — so
# we keep this list compact and well-commented HERE (outside the file).
# ----------------------------------------------------------------------------

REPL_FILE="$(mktemp -t cs-repo-rewrite-replacements.XXXXXX)"
trap 'rm -f "$REPL_FILE"' EXIT

cat > "$REPL_FILE" <<'EOF'
prontonmail==>protonmail
Cemstone==>[CUSTOMER_A]
Colas==>[CUSTOMER_B]
Heritage==>[CUSTOMER_C]
Hi-Grade==>[CUSTOMER_D]
Higrade==>[CUSTOMER_D]
Hi Grade==>[CUSTOMER_D]
Wayne Davis==>[CUSTOMER_E]
Centex Materials==>[CUSTOMER_F]
Centex==>[CUSTOMER_F]
Terminal Ready Mix==>[CUSTOMER_G]
Command Alkon==>[COMPETITOR_X]
Geoff Hollingshead==>[CONTACT_A]
Garrett Hollingshead==>[CONTACT_B]
Hollingshead==>[CONTACT_B]
Thomas Becken==>[CONTACT_C]
Jamie Forbes==>[CONTACT_D]
Remus Key==>[CONTACT_E]
Jane Smith==>[CONTACT_F]
Tripp Arnold==>[YOUR_NAME]
tarnold@sysdynetechnologies.com==>[YOUR_EMAIL]
jane@heritage.com==>contact@customer.com
remus@centex.com==>contact@customer.com
1204402035133218==>[ASANA_TEAM_GID]
1FGb57p0iKuJ1RhRGwrRez3q3RIUvF-bI==>[DRIVE_PARENT_FOLDER_ID]
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
  --replace-text "$REPL_FILE"

cat <<EOF

History rewrite complete.

NEXT STEPS — read scripts/REWRITE-HISTORY.md before doing any of these:

  1. Inspect the new history locally:
        git log --pretty='%h %an <%ae> %s' | head -40
        git log -p --all -S 'Cemstone'        # should find nothing
        git log --all | grep -i prontonmail    # should find nothing

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
