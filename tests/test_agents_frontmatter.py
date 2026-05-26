"""Frontmatter contract for `.claude/agents/*.md` (custom subagents).

Per /en/sub-agents, each subagent definition is a markdown file with YAML
frontmatter that tells Claude Code when to invoke it and what tools it
can use. We enforce four guarantees here:

1. **Frontmatter parses** — malformed YAML makes the agent silently
   unloaded with no error from Claude Code. We catch that locally.
2. **`description` is present and substantive** — Claude routes to a
   subagent by matching its description against the current task, so a
   short or empty description means the agent never gets invoked.
3. **`tools` is present** — without an allowlist, the subagent inherits
   every tool the lead has, which usually isn't what we want for a
   purpose-built subagent. Explicit narrowing is the safer default.
4. **`model` is present** — defaults to inherit but explicit is cheaper
   to reason about (e.g. cost / latency budget per subagent).

This test is a parity-style guard for the agents/ directory, mirroring
the shape of tests/test_commands_frontmatter.py.
"""
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
AGENTS_DIR = REPO_ROOT / ".claude" / "agents"


def _agent_files() -> list[Path]:
    if not AGENTS_DIR.exists():
        return []
    return sorted(AGENTS_DIR.glob("*.md"))


def _parse_frontmatter(content: str) -> dict[str, str]:
    """Minimal YAML-frontmatter parser — same shape as the commands test."""
    match = re.match(r"^---\n(.*?)\n---\n", content, re.DOTALL)
    if not match:
        return {}
    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()
    return fields


@pytest.mark.parametrize("agent_path", _agent_files(), ids=lambda p: p.name)
def test_agent_frontmatter_complete(agent_path: Path) -> None:
    content = agent_path.read_text()
    fields = _parse_frontmatter(content)

    assert fields, f"{agent_path.name}: missing or malformed frontmatter block"

    # description must be present and substantive — Claude routes tasks by
    # matching against it, so a 5-word stub effectively disables the agent.
    desc = fields.get("description", "")
    assert desc, f"{agent_path.name}: missing `description:` field"
    assert len(desc) >= 40, (
        f"{agent_path.name}: `description` is only {len(desc)} chars "
        "— too short for Claude's routing to reliably match it"
    )

    # tools must be present; empty string (no tools) is also fine for a
    # pure-reasoning agent, but the field has to be declared.
    assert "tools" in fields, f"{agent_path.name}: missing `tools:` field"

    # model must be present — defaults to inherit but explicit avoids
    # surprise cost / latency profiles.
    assert "model" in fields, f"{agent_path.name}: missing `model:` field"


def test_at_least_one_agent_defined() -> None:
    """Sanity: if this test starts failing, `.claude/agents/` got emptied
    or moved. Either is a regression worth pausing on."""
    agents = _agent_files()
    assert agents, "no .claude/agents/*.md files found"
