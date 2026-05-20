---
name: pm-execute-handover
description: >
  Use this skill whenever you (a Claude Code agent) are pointed at a project
  that contains a CLAUDE.md at the root and asked to implement, execute, build,
  or "ptal" the plan inside it. Triggers when: the working directory has a
  CLAUDE.md plus docs/ or _reference/ folders; the user says "execute the
  handover", "follow CLAUDE.md and build it", "implement this plan", "work this
  package", "do the project in CLAUDE.md", "ptal", "build out what's in here",
  or any session that begins with the user pointing at a handover package
  produced by Kai or by the `agent-handover` skill. Make sure to use this
  skill even when the package looks self-contained and you feel confident
  about the environment — the pre-flight ritual it defines (devcontainer
  confirmation + user-assistance triage) is cheap and prevents silent
  assumption drift, and the post-task documentation update it requires is
  non-negotiable.
---

# Execute Handover Package — Claude Code Workflow

## Purpose

You've been given a handover package: a project rooted at `CLAUDE.md`,
usually with `docs/` and `_reference/` alongside. This skill is the playbook
for taking that package and shipping the work — load context, confirm the
environment, flag user-required items up front, execute, verify done-done,
and update the docs before declaring complete.

This skill is the consumer side of `agent-handover` (the producer skill that
created the package). When this skill says "the CLAUDE.md", it means the
one at the project root; "the plan" means `docs/PROJECT_PLAN.md` when it
exists.

## Phase 0 — Load Context (silent prep)

Before saying anything to the user, do this internally:

1. Read `CLAUDE.md` at the project root in full.
2. Read every file `CLAUDE.md` references — by link or by path. At minimum:
   - `docs/CONTEXT.md` — background and constraints
   - `docs/DECISIONS.md` — Architecture Decision Records (ADRs)
   - `docs/PROJECT_PLAN.md` — phased implementation steps
   - any other `docs/*.md` referenced
3. Inventory `_reference/` — list what's in there and note which files
   the plan tells you to copy / port / merge from. Don't read every
   file end-to-end yet; read on demand during Phase 2.
4. Capture the **Definition of Done** from `CLAUDE.md` verbatim. This is
   your stopping criterion. If there isn't one, that's your first
   user-assistance item in Phase 1.

This phase is internal. Don't dump a context summary back to the user —
move straight to Phase 1.

## Phase 1 — Pre-flight Briefing (REQUIRED, DO NOT SKIP)

Your first message to the user combines two things in one short reply.
Send them together so the user can address everything in one round trip.

### 1a. Environment Confirmation

Ask exactly this:

> **Are you in a PM dev container?**
>
> 1. **Yes** *(default)*
> 2. **No**
> 3. Provide other context

The handover package was authored assuming you're running inside a
[pmdevcontainer](https://github.com/ThedreamersTop/pmdevcontainer) — a
preconfigured devcontainer with the standard PM toolchain. Paths,
installed tools, network policy, and shell behavior in the plan all
assume that environment.

How to handle each branch:

- **Yes** → proceed. Assume the standard devcontainer layout, tools,
  and network policy; don't re-verify the basics.
- **No** → stop. Ask whether the user wants to (a) spin up the
  devcontainer first, or (b) describe their actual environment so you
  can adapt the plan. Do not start execution until you know which.
- **Provide other context** → wait for the user's context, then
  re-check whether the assumptions in CLAUDE.md still hold. Flag any
  that don't before proceeding.

If the user replies with a generic affirmative ("go ahead", "sure",
"continue") without naming an option, treat that as confirming option
1 (Yes). Only deviate if they explicitly say No or supply other context.

### 1b. User-Assistance Triage

In the same reply, list anything the package needs from the user that
you cannot do yourself. Surface this up front so the user can address
it before you start — or at least know exactly when you'll have to
interrupt them. Common items:

- API keys, tokens, or credentials referenced in CLAUDE.md but not
  present in `.env` or expected secrets storage
- External accounts the user must create (you never create accounts
  for the user)
- Manual approvals or browser logins (OAuth grants, GitHub repo
  creation, billing flows)
- Decisions left open in the package — `TBD`, `decide later`, or
  contradictions between CLAUDE.md and DECISIONS.md
- Hardware, paid services, or APIs the agent cannot reach
- Anything where DECISIONS.md says "needs user confirmation"

If there are no such items, say so explicitly:

> No user input required up front — I have everything I need.

If there are, list them with a clear ask. Example shape:

> **Before I start, I need from you:**
> 1. A `POSTMARK_API_KEY` in `.env` — CLAUDE.md references it but it
>    isn't set.
> 2. The repo `commondefense-emails` to exist on GitHub under your
>    account — I'll push to it but won't create it.
> 3. Confirmation on ADR-003: CLAUDE.md says "use Redis" but
>    DECISIONS.md has it as "Accepted with caveat — confirm with user."

Wait for the user to respond before starting Phase 2.

## Phase 2 — Execute the Plan

Once the environment is confirmed and user-assistance items are addressed
(or explicitly acknowledged as "I'll handle that later, you can hit
that step"), work the plan.

### Working principles

- **Follow PROJECT_PLAN.md phase by phase** when it exists. Each phase
  has a Verify section — actually run those steps, don't just claim them.
- **Decisions are made.** CLAUDE.md and DECISIONS.md are opinionated by
  design. Don't second-guess accepted decisions; if you find a real
  blocker, surface it to the user rather than silently choosing a
  different path.
- **Reuse what the package says to reuse.** CLAUDE.md's "What to Reuse
  vs. Build New" section is authoritative. Don't rewrite from scratch
  what it says to copy or port.
- **Honor the negative constraints.** "What NOT to Do" in CLAUDE.md
  is there because someone already burned time on the wrong approach.
  Believe it.
- **Test as you go.** Don't batch all testing for the end. After each
  phase or non-trivial change, run the relevant tests, lints, or a
  smoke run. Fix breakages before moving on.
- **No leftover TODOs in production code.** If you genuinely can't do
  something, surface it; don't paper it over with a `# TODO: fix later`.

### Self-testing

You are responsible for your own QA. The user should not be the one
finding obvious bugs. While executing, and again before declaring
anything done:

- Run all unit tests (write them if they're missing for new code)
- Run the project end-to-end at least once on a realistic input
- Exercise the unhappy paths you can reasonably exercise
- Lint and type-check if those are configured
- Check that any binaries or scripts you produced actually run from a
  fresh shell, not just from the state your last command left behind

If a test fails, fix it. If you can't fix it without help, that's a
user-assistance item — go back and surface it before continuing.

## Phase 3 — Done-Done Verification

"Done-done" means the work is genuinely shippable, not "I wrote some
code that probably works." Before returning to the user, walk this
checklist explicitly:

- [ ] Every item in CLAUDE.md's **Definition of Done** is met. Be ready
      to quote each one and state how you verified it.
- [ ] Every phase in `docs/PROJECT_PLAN.md` has its checkboxes ticked
      *and* its Verify section actually run.
- [ ] All tests pass on a clean run (not just incrementally).
- [ ] The project builds, installs, and runs from a clean state — no
      "works on my cache" surprises.
- [ ] No `# TODO`, `# FIXME`, or commented-out blocks left in production
      code without an explicit, justified comment.
- [ ] No secrets, API keys, or personal info committed.
- [ ] Anything the user must do post-handoff (e.g., "register the
      webhook URL with Postmark") is captured in `README.md`.

If any line fails, you are not done. Loop back to Phase 2.

## Phase 4 — Update README.md and CLAUDE.md

This phase is **mandatory**. Do not return to the user as "complete"
without it.

### README.md

Update (or create if missing) so a fresh reader who has never seen the
project knows:

- What this project is, in 1–2 sentences
- How to install / set up — concrete commands, prerequisites, env vars
- How to run it — entry points, common commands
- Current status — what works, what's known to be incomplete
- Any post-install user actions still required

The README is for humans (the user, future contributors). Keep it
short, copy-pasteable, and accurate.

### CLAUDE.md

Update CLAUDE.md so the **next** agent (or you in a future session)
gets an accurate map. Specifically:

- Mark each Definition of Done item with its current state — ✅ Done /
  ⏳ Partial (reason) / ❌ Not done (reason).
- Add a `## Current State` section near the top summarizing what was
  built, what changed from the original plan, and why.
- Update the directory tree if the structure drifted from what was
  originally planned.
- Add a `## Gotchas Discovered` section if you hit non-obvious things
  during execution that weren't in the original CLAUDE.md — future
  sessions will thank you.
- If decisions changed mid-execution, append new ADRs to
  `docs/DECISIONS.md` and reference them from CLAUDE.md.

The goal: someone (human or agent) opening this repo a month from now
should understand the current state without re-reading the entire
codebase.

## Phase 5 — Hand Back to the User

Your final reply should include:

1. A short summary (5–10 lines) of what was built and verified.
2. The Definition of Done checklist, with each item marked.
3. Any post-completion user actions (one-time setup, deployments,
   webhook registrations).
4. Pointers to `README.md` and the updated `CLAUDE.md`.
5. A brief note on anything you'd flag for the next session (e.g., "X
   is brittle — worth a follow-up", "Y was out of scope but obvious
   next step").

Keep it concise. The user can read the docs you just updated; don't
re-summarize them at length in chat.

## What NOT to Do

- **Don't skip Phase 1.** Even if the package looks fully self-contained
  and you're confident about the environment, the pre-flight is
  required. It's cheap and it prevents silent assumption drift.
- **Don't dribble out questions one at a time.** Phase 1 is a single
  message. Surface the environment question and the user-assistance
  triage together.
- **Don't ship without docs updates.** A "complete" task without
  README.md and CLAUDE.md updates is not complete — you're leaving the
  next person (human or agent) blind. Phase 4 is non-negotiable.
- **Don't invent scope.** If the plan says X, build X. If you think
  the plan is missing something important, raise it as a question or
  a follow-up note — don't quietly expand the work.
- **Don't silently change accepted decisions.** If DECISIONS.md says
  "use Postgres" and you decide Redis is better, that's a question
  for the user, not a unilateral change.
- **Don't declare done from optimism.** "I think this works" is not
  done-done. If you didn't actually run it end-to-end, you didn't
  verify it.

## Quick Reference

| Phase | What | Output |
|-------|------|--------|
| 0 | Read CLAUDE.md + linked docs, inventory `_reference/` | Internal context |
| 1 | Env confirmation + user-assistance triage | One message to user, then wait |
| 2 | Execute the plan, test as you go | Working code / artifacts |
| 3 | Done-done verification | Internal checklist passed |
| 4 | Update README.md + CLAUDE.md | Updated docs in repo |
| 5 | Hand back with summary and pointers | Final user message |