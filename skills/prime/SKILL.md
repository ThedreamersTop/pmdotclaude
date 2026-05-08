---
name: prime
description: Initialize working context for a repository before starting substantive coding or analysis. Use this skill whenever the user wants to start a task, prime/bootstrap context, understand the repo, inspect project architecture, initialize context, onboard to an unfamiliar codebase, or asks what should be read before making changes—even if they do not explicitly say "prime."
---

# Prime

Use this skill to build a compact, accurate mental model of the current repository before doing task-specific work. The goal is not to read everything; it is to identify the project shape, core technologies, key entry points, and workspace guidance so future actions are grounded in the repo's actual conventions.

## Workflow

### 1. Establish the repository inventory

Start with read-only discovery so you know what files are available and where the project boundaries are.

- Run `git ls-files` when the repository is tracked by Git.
- If `git ls-files` fails or returns too little, list the top-level directory and one or two levels of subdirectories.
- Note major directories such as `src/`, `app/`, `packages/`, `services/`, `tests/`, `docs/`, `scripts/`, `infra/`, `.github/`, `.claude/`, and `skills/`.
- Watch for monorepo indicators, nested projects, generated/vendor directories, and files that should not be read unless needed.

### 2. Read human-authored orientation docs

Prioritize docs that explain intent and local conventions.

- Read `README.md` first when present.
- Check for `CLAUDE.md` in the repository root and relevant subdirectories. Treat it as workspace-specific guidance for how agents should work in this repo.
- Skim other obvious orientation docs only when they are likely to affect next steps, such as `CONTRIBUTING.md`, `AGENTS.md`, `ARCHITECTURE.md`, `docs/*README.md*`, or package-specific README files.

### 3. Identify architecture and project boundaries

Use the file inventory and docs to infer the system shape before reading implementation details.

- Determine whether the repo is a single app, library, CLI, service, monorepo, template, documentation repo, or collection of skills/commands.
- Identify major runtime components and how they relate, such as frontend/backend, API/worker, package boundaries, plugins, or generated artifacts.
- Find likely entry points: application bootstrap files, CLI commands, route definitions, package exports, main modules, or command definitions.
- Locate tests and examples to understand expected behavior.
- Note any important non-code assets, schemas, prompts, templates, migrations, infrastructure, or automation.

### 4. Detect frameworks, languages, and tooling

Read only enough configuration to understand how the project is built and validated.

- Inspect package and tool manifests as applicable: `package.json`, `pnpm-workspace.yaml`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `requirements*.txt`, `Makefile`, `justfile`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/*`, and similar files.
- Identify primary languages, frameworks, package managers, test runners, linters, formatters, and build tools.
- Record canonical commands for install, test, lint, format, build, typecheck, and local run when the docs or manifests make them clear.
- Do not install dependencies, run migrations, start long-lived services, or perform state-changing setup unless the user explicitly asks.

### 5. Map configuration and operational paths

Capture the files future task work is likely to depend on.

- Identify environment/config files such as `.env.example`, config directories, deployment manifests, CI workflows, and secrets guidance.
- Note where project-specific agent instructions, commands, skills, templates, or prompt files live.
- Note data directories, generated outputs, cache folders, and ignored paths when visible from docs or Git configuration.
- If the upcoming task is known, follow any conditional documentation guidance and read only the relevant docs for that task type.

### 6. Summarize before proceeding

End priming by giving the user a concise summary that confirms alignment before doing substantive work. Include uncertainties rather than guessing.

Use this output shape:

```markdown
## Codebase Summary

- **Purpose:** <what this repo appears to be for>
- **Architecture:** <major components and boundaries>
- **Key technologies:** <languages, frameworks, package managers, build/test tools>
- **Important paths:** <docs, source, tests, config, commands/skills, CI, scripts>
- **Workspace guidance:** <relevant CLAUDE.md or AGENTS.md instructions found>
- **Likely validation commands:** <tests/lints/builds discovered, or "not yet identified">
- **Open questions:** <anything still unclear that matters before starting the task>

Ready to proceed with: <the user's requested task or the next clarified step>.
```

Keep the summary short enough to be useful as shared context. If the user already gave a concrete task, ask at most one focused clarifying question only when the missing information would materially change what to do next.