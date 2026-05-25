"""Shared parsing helpers for hooks that inspect bash commands.

Centralizes git-invocation detection so secret-scan, branch-enforcer, and
block-attribution agree on what counts as a `git commit` — even when the
command has global options like `-c key=value`, `--no-pager`, `-C path`,
or leading env-var assignments.

Also exposes a `push_targets_protected_branch` helper used by push-guard
to catch all the refspec forms (`+main`, `HEAD:main`, `refs/heads/main`,
`:main`) instead of only the literal-token form.
"""
import re


def _git_subcommand_re(subcommand: str) -> re.Pattern:
    """Match a git invocation that runs the given subcommand, tolerating
    global options between `git` and the subcommand, plus leading env-var
    assignments like `GIT_AUTHOR_NAME=x git commit`.
    """
    return re.compile(
        r"(?:^|\s|&&|;|\|)\s*"                  # statement separator
        r"(?:[A-Z_][A-Z0-9_]*=\S+\s+)*"         # optional env-var prefix
        r"\bgit\b"
        r"(?:"
            r"\s+-[A-Za-z](?:\s+\S+)?"          # -c key=val, -C path, -p
            r"|\s+--[A-Za-z][\w-]*(?:=\S+)?"    # --no-pager, --git-dir=/x
        r")*"
        r"\s+" + re.escape(subcommand) + r"\b"
    )


_GIT_COMMIT_RE = _git_subcommand_re("commit")
_GIT_PUSH_RE = _git_subcommand_re("push")


def is_git_commit(command: str) -> bool:
    """True when the bash command runs `git commit` in any form, including
    `git -c key=val commit`, `git --no-pager commit`, `GIT_AUTHOR_NAME=x git commit`.
    """
    return _GIT_COMMIT_RE.search(command) is not None


def is_git_push(command: str) -> bool:
    """True when the bash command runs `git push` in any form, tolerating
    global options before the `push` subcommand.
    """
    return _GIT_PUSH_RE.search(command) is not None


_REFS_HEADS_PREFIX = re.compile(r"^refs/heads/")


def push_targets_protected_branch(command: str, protected=("main", "master")) -> bool:
    """True when a `git push` command targets a protected branch.

    Recognizes every refspec form git accepts:
      git push origin main
      git push main
      git push origin +main                  (force-push, `+` prefix)
      git push origin HEAD:main              (push HEAD to main)
      git push origin feature:main           (push feature branch to main)
      git push origin refs/heads/main        (fully qualified ref)
      git push origin :main                  (delete remote main)
      git --no-pager push origin main        (with global option)
      git -c key=val push origin main        (with -c key=val)

    Does NOT match when the destination is a different branch even if "main"
    appears elsewhere:
      git push origin main:dev               (pushing FROM main TO dev)
      git push origin feature/main           (slash-named branch, dest=feature/main)
      git push origin mainstream             (substring match avoided)
    """
    match = _GIT_PUSH_RE.search(command)
    if not match:
        return False

    # Walk only the args immediately following `push`, stop at any statement
    # separator so `git push origin feature && rm main` doesn't false-positive.
    tail = command[match.end():]
    tail = re.split(r"\s*(?:;|&&|\|\||\||\n)", tail, maxsplit=1)[0]

    for token in tail.split():
        if token.startswith("-"):
            continue                       # option flag (e.g. -u, --force, --repo=x)
        if token.startswith("+"):
            token = token[1:]              # strip force-push prefix
        if ":" in token:
            _, dest = token.split(":", 1)  # refspec — destination is after the colon
        else:
            dest = token
        dest = _REFS_HEADS_PREFIX.sub("", dest)
        if dest in protected:
            return True
    return False
