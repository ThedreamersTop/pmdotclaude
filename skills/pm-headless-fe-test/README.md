# pm-headless-fe-test

A Claude Code skill for **headless visual verification of frontend projects**: it drives a project's running dev server in headless Chromium via Puppeteer and saves numbered screenshots of every interaction state into the project's `images/` folder. Works on React, Vue, Svelte, Next, Vite, or anything that serves HTML on localhost.

Use it when you've just built or changed a UI and want quick visual proof that the app renders and behaves correctly — initial state, after a click, modal open, modal closed, async updates, etc. — without needing to open a browser yourself.

## When this skill triggers

You don't have to name it. Phrases like these all trigger it:

- "Spin up the website and take screenshots"
- "Play around with the app and save snapshots of each state"
- "Visual test the frontend"
- "Screenshot the popup states"
- "Capture before/after a button click"
- "Drive the page with Puppeteer"

It also triggers when you paste a specific symptom:

> `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`

That error means the Puppeteer-bundled Chrome is the wrong architecture. The skill's environment preflight is the fix.

## What's in the directory

```
pm-headless-fe-test/
├── SKILL.md                    The instructions Claude reads when the skill triggers
├── README.md                   This file (human orientation)
├── assets/
│   └── interact.template.js    Puppeteer driver template — Claude copies & customizes per project
├── scripts/
│   └── preflight.sh            Bash script: detect host arch, verify a usable Chromium, install if missing
└── evals/
    └── evals.json              Test prompts used by the skill-creator eval loop
```

## Workflow at a glance

1. **Project preflight.** Read `package.json` to find the dev-server script (`start` / `dev` / `serve`) and its port. Ensure `puppeteer` is a devDependency; install if not.
2. **Environment preflight.** Run `scripts/preflight.sh`. It checks `uname -m`, inspects any cached Puppeteer Chrome binary's arch with `file`, and if there's a mismatch installs `chromium` via apt (Debian/Ubuntu). On success it prints `CHROME_BIN=<path>` for downstream use.
3. **Write the interaction script.** Copy `assets/interact.template.js` to the project root as `interact.js`, then read the app's JSX/HTML for real selectors and customize the interactions block. Each interaction follows the pattern: click → `waitForSelector({visible|hidden})` → optional padding `sleep(150–500ms)` → `screenshot`.
4. **Run.** Start the dev server in the background, poll readiness with `curl`, run `CHROME_BIN=/usr/bin/chromium node interact.js`, then stop the dev server.
5. **Verify.** `ls images/` to confirm every PNG is present and >30KB, then open 2–3 with the Read tool and visually confirm the captures show what the script intended. Filenames lie; pixels don't.

See `SKILL.md` for the full workflow including failure-mode debugging.

## Why a separate skill?

Claude can usually figure this out from first principles, but three specific failure modes are easy to miss and silently produce bad screenshots:

1. **Wrong-arch Chrome.** Puppeteer's cached Chrome is often x86-64 inside an aarch64 container, producing a confusing `rosetta error`. Without preflight, agents waste tokens diagnosing.
2. **Sleep-based timing.** Using `setTimeout` between interactions instead of `page.waitForSelector` means screenshots intermittently capture half-loaded frames. Bare-Claude baseline runs frequently skip this gating; the skill makes it the default pattern.
3. **Silent JS errors.** Without `pageerror` / `console.error` listeners, errors in the running app are invisible — the screenshot just looks "weird" and the cause is unclear.

The skill enforces a workflow that addresses all three.

## Installing this skill

Copy or symlink the `pm-headless-fe-test/` directory into `~/.claude/skills/`:

```bash
cp -r pm-headless-fe-test ~/.claude/skills/
```

After that, Claude Code will auto-discover it. No registration step needed.

## Eval results

Three test prompts (this skill vs. baseline Claude with no skill), one run per cell:

| Eval | Description |
|------|-------------|
| 0 | Screenshot a React+Webpack counter app |
| 1 | Scaffold fresh Vite+React, screenshot states |
| 2 | Modernize a broken Puppeteer script (`page.waitForTimeout` removed) |

### Iteration 1 (initial release)

| Metric | With skill | Baseline |
|--------|-----------|----------|
| Pass rate | 21/22 (95%) | 19/22 (90%) |
| Time | 150s ± 10s | 146s ± **41s** |
| Tokens | 38,368 ± **699** | 29,608 ± 3,782 |

The single discriminating assertion was `driver-script-gates-on-dom-state`: in the Vite test, the baseline used **zero** `page.waitForSelector` calls (sleeps everywhere). That's the exact failure mode the skill is built to prevent.

### Iteration 2 (added `assets/lib.js` interaction helpers, promoted DOM-gating to a top-of-file "non-negotiable patterns" section)

| Metric | With skill | Baseline |
|--------|-----------|----------|
| Pass rate | 21/22 (95%) | 21/22 (95%) |
| Time | 204s ± 76s\* | 136s ± 24s |
| Tokens | 43,324 ± **770** | 32,147 ± 3,874 |

\* One eval-0 with-skill run took 292s (an outlier — the agent did extra verification).

Iteration 2 added the `lib.js` artifact but **raised** with-skill token cost by ~5k because SKILL.md's workflow directed the agent to `Read` `lib.js` to learn its API.

### Iteration 3 (lazy-load: inline lib.js API + references/ pattern + trimmed description)

| Metric | With skill | Baseline |
|--------|-----------|----------|
| Pass rate | 21/22 (95%) | 21/22 (95%) |
| Time | **138s** ± 13s | 142s ± 47s |
| Tokens | **39,698** ± 2,010 | 31,401 ± 5,354 |

What changed:
- Inline `lib.js` API table directly in SKILL.md §3 — the agent has the full helper API in-context and no longer needs to `Read` the file's source. Source-reading is now opt-in for edge cases.
- Failure-mode table moved to `references/troubleshooting.md` (read only on failure).
- Framework mount-selector cheat-sheet moved to `references/frameworks.md` (read only when uncertain).
- YAML `description:` trimmed 145 → 91 words (every Claude Code session pays this cost).
- `lib.js` inline doc comments slimmed (signatures and usage now live in SKILL.md table; `lib.js` keeps only *why* rationale).

Cross-iteration recap of with-skill cost and gate quality:

| Iter | Pass | Tokens (mean ± stddev) | Time (mean ± stddev) | Gates per run (mean / range) |
|------|------|------------------------|----------------------|------------------------------|
| 1 | 21/22 | 38,368 ± 699 | 150s ± 10s | 6.7 (5–8) |
| 2 | 21/22 | 43,324 ± 770 | 204s ± 76s | 7.3 (7–8) |
| 3 | 21/22 | **39,698 ± 2,010** | **138s ± 13s** | 5.7 (5–6) |

**Verdict:** iteration 3 recovered ~70% of the iter-1 → iter-2 cost increase (back to within +3.5% of iter-1's token mean) while keeping the `lib.js` artifact and the structural improvements. Wall-clock dropped 32% vs iter-2. Pass rate held at 21/22 across all three iterations. Gate count dipped slightly (5.7 vs iter-2's 7.3) — the agent now relies more on the API table than full lib.js reading — but the minimum was 5 gates per run, comfortably above the without-skill mean of 4.0 and well above the assertion's ≥1 threshold.

Iteration-3 is the current shipped version.
