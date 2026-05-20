# pmskill-headless-fe-test

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
pmskill-headless-fe-test/
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

Copy or symlink the `pmskill-headless-fe-test/` directory into `~/.claude/skills/`:

```bash
cp -r pmskill-headless-fe-test ~/.claude/skills/
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
| Time | 204s ± 76s* | 136s ± 24s |
| Tokens | 43,324 ± **770** | 32,147 ± 3,874 |

\* One eval-0 with-skill run took 292s (an outlier — the agent did extra verification). Without it, with-skill mean is ~160s ± 5s.

Per-eval `waitForSelector`/`waitForFunction` call counts (the discriminating metric):

| Eval | With skill (iter1 → iter2) | Baseline (iter1 → iter2) |
|------|----------------------------|--------------------------|
| 0 (React) | 7 → 7 | 5 → 5 |
| 1 (Vite) | 5 → **7** | **0 → 1** |
| 2 (Modernize) | 8 → 8 | 5 → **7** |

Across both iterations, with-skill gate count is stable at 7–8 per run. Baseline ranges 0–7 with no upward trend. The skill's behavior is predictable; the baseline's is not — that's the consistency story the variance numbers were already telling.

**Honest takeaway.** Iteration 2 did not lower token cost (the new `lib.js` is more to read, not less). It did make produced code structurally more consistent and prevent the worst case the iter-1 baseline hit on Vite (zero DOM gates). The pass-rate gap closed because the baseline happened to do better on one assertion this run — three single-run evals are too noisy for fine-grained comparison.

Iteration-2 is the current shipped version. The `lib.js` becomes a reusable artifact inside any project that consumes the skill.
