# Skills

Built-in skills live directly under `skills/<name>/SKILL.md`.

`skills/library/` is reserved for the private `pmAgentLib` repository and is intentionally ignored by `pmdotclaude`. Install it with:

https://github.com/ThedreamersTop/pmAgentLib
https://github.com/ThedreamersTop/pmAgentConfigRegistry

```bash
pm_tools/scripts/install_pmAgentLib.sh
```

This keeps `pmdotclaude` and `pmAgentLib` as separate Git repositories while allowing Claude Code to load private library skills from `~/.claude/skills/library`.