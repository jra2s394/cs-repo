# rewrite-history.sh — what it does and how to use it

This script is **destructive**. It rewrites the entire git history of this repo.
Do not run it casually. Do not run it from CI. Read this whole file first.

---

## Why this script exists

The git history of `cs-repo` has three classes of leaks that the working tree
scrub (`chore/scrub-and-harden`) cannot remove on its own:

1. **Identity correlation.** Some commits are signed with
   `tripp.arnold@protonmail.com` and others with `[YOUR_EMAIL]`.
   Both addresses are visible in `git log --pretty=fuller`, which permanently
   links the two identities together.
2. **Typo in a commit message.** PR #23 landed with `protonmail` in the
   commit body. The wrong-spelling string itself is searchable forever in
   `git log`.
3. **Historical file contents.** Even after the working-tree scrub, the
   customer names, contact names, Asana GID, and Drive folder ID are still
   present in `git show <old-sha>:<path>`. They surface in `git log -p`,
   GitHub's blame views, and any mirror clone.

`git filter-repo` is the only practical way to fix all three at once.

---

## What the script changes

| Class | What it does |
|---|---|
| Author/committer emails | Every commit's author and committer identity is rewritten to a single `(CHOSEN_NAME, CHOSEN_EMAIL)` you choose in the script. |
| Commit messages | Literal substring rewrites: `protonmail` → `protonmail`, plus every customer/contact name replaced with a `[PLACEHOLDER]` token. |
| File blobs | Same literal substring rewrites applied across every historical version of every tracked file. The leaks vanish from `git log -p` and `git show`. |

The substitutions are applied as **literal strings, case-sensitive** by
git-filter-repo. The list lives in the heredoc inside the script — edit it
if you want to add, remove, or rephrase any rule.

---

## What the script does NOT change

- It does not touch the working tree of branches that have already been
  scrubbed by `chore/scrub-and-harden` — file contents at HEAD are already
  clean. Filter-repo only changes history.
- It does not delete tags. (If you want to drop tags, add `--tag-rename ''`
  or do it manually after.)
- It does not push. You force-push by hand at the end, intentionally.

---

## Consequences — read these before running

1. **Every commit SHA changes.** Old SHAs in PR descriptions, links, release
   notes, slides, and external bookmarks will 404 after the force-push.
2. **Every existing clone breaks.** Anyone with this repo cloned locally
   will get fast-forward errors on their next `git fetch` and **MUST** re-clone.
   There is no graceful migration path.
3. **Forks become orphaned.** Public forks on GitHub keep pointing at the
   old commit graph; they will not auto-update.
4. **Cached views may persist.** GitHub's web UI caches some old commit
   pages for a while. The underlying objects are unreachable, but the cache
   URLs may briefly still resolve.
5. **PR and issue numbers are preserved.** GitHub stores PR/issue metadata
   independently from commit objects. PR #23's number stays #23; only its
   linked commit SHA changes (and the PR's old SHA-based links 404).
6. **Tokens that ever appeared in history remain compromised.** Filter-repo
   cannot undo the fact that a secret was on a public remote. Rotate any
   such tokens at the issuing service. That stands regardless of whether
   you run this script.

---

## Running the script

### 1. Make a backup clone

```bash
cd ~/Developer
git clone --mirror <your-repo-path>/cs-repo cs-repo-backup.git
```

This gives you a complete recovery point if the rewrite goes sideways.

### 2. Install git-filter-repo

```bash
brew install git-filter-repo
# or:
pip install git-filter-repo
```

Verify with `git filter-repo --help`.

### 3. Edit the script

Open `scripts/rewrite-history.sh`. At the top:

```bash
CHOSEN_EMAIL=""
CHOSEN_NAME=""
```

Set both. This is the identity every historical commit will be re-authored to.

Optional: scroll to the `REPL_FILE` heredoc and add/remove substitution rules
if you want different replacements than the defaults.

### 4. Run from a clean working tree

```bash
cd <your-repo-path>/cs-repo
git status      # must be clean
./scripts/rewrite-history.sh
# type REWRITE when prompted
```

The script will:

- enumerate every (name, email) pair in history,
- generate a mailmap that points each one at your chosen identity,
- assemble the replacement rules,
- invoke `git filter-repo` with `--mailmap` + `--replace-text`,
- print a "what to do next" block.

### 5. Verify locally before pushing

```bash
# Identities should all be the chosen one:
git log --all --pretty='%an <%ae>' | sort -u

# These strings should not appear anywhere in history:
git log --all -p -S '[CUSTOMER_A]'
git log --all -p -S '[YOUR_EMAIL]'
git log --all -p -S 'protonmail'
git log --all -p -S '[ASANA_TEAM_GID]'
git log --all -p -S '[DRIVE_PARENT_FOLDER_ID]'
```

Every command above should print nothing.

### 6. Re-add the origin remote

`git filter-repo` removes the `origin` remote by design (its safety
mechanism to prevent accidental push).

```bash
git remote add origin git@github.com:jra2s394/cs-repo.git
```

### 7. Force-push

**This is the irreversible step.** Notify any collaborators first.

```bash
git push --force --all origin
git push --force --tags origin
```

You may need to temporarily relax GitHub branch protection to allow the
force push on `main`. Re-enable protection immediately afterward.

### 8. Tell everyone with a clone to re-clone

Their existing clones cannot reconcile. Easiest:

```bash
cd /path/to/old-clone
cd ..
rm -rf old-clone
git clone git@github.com:jra2s394/cs-repo.git
```

### 9. Rotate any tokens that were ever in history

Even with the rewrite, anything ever pushed to the public remote should be
considered compromised. Rotate at the source.

---

## Recovery if something goes wrong

The backup clone from step 1 is a full mirror. To restore:

```bash
cd ~/Developer
rm -rf cs-repo
git clone cs-repo-backup.git cs-repo
cd cs-repo
git remote set-url origin git@github.com:jra2s394/cs-repo.git
git push --force --all origin
git push --force --tags origin
```

---

## Why I should not just run this from CI

- It rewrites the history of every branch, including ones CI doesn't know about.
- It needs human judgment on what counts as a successful run (the verification grep above).
- A force-push from CI to `main` would race against any in-flight PRs and lose them.

Run it locally, deliberately, when you are ready.
