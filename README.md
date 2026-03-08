# pm-dotclaude

A deployable **Claude Code configuration template** — clone this into any user's `~/.claude` to instantly provision a pre-configured, agentic Claude Code environment.

## What's included

| Path | Purpose |
|---|---|
| `commands/` | Custom slash commands (skills): plan, implement, feature, commit, review |
| `settings.json` | Global Claude Code settings (full-autonomy mode by default) |
| `plugins/` | Plugin registry — `superpowers` and marketplace configs |
| `pm_tools/` | PM-side agentic engineering scripts and tools |

## Deploy to a new user

```bash
git clone git@github.com:kamisan118/pmdotclaude.git ~/.claude
```

That's it. Open any project in Claude Code and all commands, settings, and tools are active.

## Slash commands

- `/prime` — Bootstrap Claude's understanding of a codebase
- `/plan` — Create a structured task plan
- `/feature` — Full SDLC feature planning with spec output
- `/implement` — Execute a plan file step by step
- `/review` — Review implemented work against a spec (with screenshots)
- `/commit` — Generate a structured git commit message

## pm_tools

Scripts for orchestrating Claude Code in agentic/autonomous mode:

- `pm_tools/scripts/run_cc_full_perm.sh` — Launch Claude with `--dangerously-skip-permissions`

## plugins 

- Plugins are not managed by this repo, we only put the recommended plugins and how to install them here instead. 
- (empty) atm!