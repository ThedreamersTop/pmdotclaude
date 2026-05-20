---
name: pm-headless-fe-test
description: Drive a frontend dev server with headless Puppeteer + system Chromium and save numbered screenshots of UI interaction states into `images/`. Use whenever the user wants to take screenshots of a web app, visually verify the frontend, capture before/after states, smoke-test a React/Vue/Svelte/Next/Vite project headlessly, "play around with" or "interact with" the page, or drive the running site with Puppeteer — even if they don't say "Puppeteer" explicitly. Also triggers on the `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2` symptom (wrong-arch bundled Chrome — the preflight here is the fix).
---

# Headless Frontend Test & Screenshot

Drive a project's frontend through a sequence of user interactions in a headless browser and save a screenshot of each state. The goal is fast visual confirmation that the app renders and behaves correctly — not pixel-perfect regression testing.

## When to use vs. when not to

Use when: the user wants to *see* the app at multiple states, has just built or changed UI, or wants visual evidence a feature works end-to-end through a real browser. Also use when explicitly asked to "play around with" or "exercise" the app.

Don't use when: the user only wants unit/component tests (use Jest, Vitest, etc.), only wants a static snapshot of a single state with no interaction (a one-line `curl` or `page.screenshot` is enough), or the project already has a Playwright/Cypress suite the user wants you to extend — use those instead.

## Non-negotiable patterns

Three rules. Skipping any of them is the difference between a reliable run and intermittent, hard-to-diagnose flake. The bundled `lib.js` enforces all three by construction — use it and you cannot violate them by accident.

1. **Gate on DOM state, never on `sleep` for state changes.** When an action causes something to appear/disappear/update, wait for the matching `page.waitForSelector({ visible: true | hidden: true })` or `page.waitForFunction(...)`. Reserve `sleep` (≤500ms) strictly as padding for CSS transitions where there is no DOM signal — never as a proxy for "give the app a moment."
   *Reason:* animations, async fetches, and React/Vue reconciliation all have unpredictable timing. A fixed sleep is a race condition — intermittently it captures half-loaded frames, and the failure is silent (you get a PNG, just the wrong one). This is the single most common way these tests go wrong.

2. **Always set `executablePath` to a system Chromium.** Use `executablePath: process.env.CHROME_BIN || '/usr/bin/chromium'`. `lib.launch()` already does this.
   *Reason:* the cached Chrome under `~/.cache/puppeteer/` is frequently the wrong architecture (especially aarch64 containers where Puppeteer ships x86-64). Launching it fails with `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`.

3. **Wire `pageerror` and `console.error` listeners on every page.** `lib.launch()` does this.
   *Reason:* without these, JS errors in the running app are invisible. The screenshot just "looks weird" with no signal as to why.

## Workflow

### 1. Project preflight

Before touching anything, understand the project.

- Read `package.json` to find the dev-server script. Look at the `scripts` block — try `start`, `dev`, `serve` in that order. Note any explicit `--port` flag; if none, the framework default usually wins (webpack-dev-server: 3000, Vite: 5173, CRA: 3000, Next.js: 3000). Read the framework config (`vite.config.*`, `webpack.config.*`, `next.config.*`) only if the port is non-obvious.
- Check Puppeteer is a devDependency. If not, install: `npm i -D puppeteer`. (If the project uses pnpm/yarn, match its conventions.)
- Read the entry component(s) (`src/App.*`, `src/main.*`, top-level routes) **before** writing the interaction script. You need real selectors — class names, button text, data-testids. Guessing leads to silent script failures or wrong screenshots.

### 2. Environment preflight (run the bundled script)

Containers and ARM machines frequently ship the wrong Chromium binary in Puppeteer's cache. Run the bundled preflight to detect and remediate:

```bash
bash <path-to-skill>/scripts/preflight.sh
```

The script reports `uname -m`, `file`-checks any cached Puppeteer Chrome, and if needed runs `sudo apt-get install -y chromium` on Debian/Ubuntu. On success it prints `CHROME_BIN=<path>` on stdout.

If preflight fails (no apt, no sudo, non-Debian distro), tell the user explicitly: "I cannot launch a headless browser in this environment because <reason>." Do not silently fall back to an unrelated method.

Optional: if the app's UI uses emoji and you care about them rendering, `sudo apt-get install -y fonts-noto-color-emoji`.

### 3. Write the interaction script

The skill bundles two files in `assets/`:

- **`lib.js`** — interaction helpers. Enforces the three non-negotiable patterns by construction. Copy verbatim into the project root.
- **`interact.template.js`** — a minimal driver script that calls `lib.js`. Copy to the project root as `interact.js`, then customize the interactions block.

```bash
cp <path-to-skill>/assets/lib.js               <project-root>/lib.js
cp <path-to-skill>/assets/interact.template.js <project-root>/interact.js
```

Then customize `interact.js` for the app:

1. Set `MOUNT_SELECTOR` to something the app actually renders (typical defaults: `#root > *` for React, `#app > *` for Vue, `#__next > *` for Next.js pages-router, or a project-specific root class). If unsure for the framework in front of you, read `references/frameworks.md`.

2. Replace the example interactions using helpers from this `lib.js` API. You don't need to read the source of `lib.js` to use it — these signatures are everything:

   | Helper | Signature | Use for |
   |--------|-----------|---------|
   | `launch(opts?)` | `→ { browser, page }` | Replaces `puppeteer.launch`; wires viewport + error listeners + `executablePath` to system Chromium |
   | `goto(page, url, { mountSelector })` | `→ void` | Navigate + wait for framework mount |
   | `shoot(page, name)` | `→ filepath` | Viewport screenshot to `images/<name>.png` |
   | `clickAndCapture(page, sel, name, { pad? })` | `→ filepath` | Click + small CSS-transition pad + capture; use when the click changes state without a clear DOM signal (counter increment, hover) |
   | `openModalAndCapture(page, trigger, target, name, { pad?, timeout? })` | `→ filepath` | Click trigger + wait `{ visible: true }` on `target` + capture |
   | `closeModalAndCapture(page, closeBtn, target, name, { pad?, timeout? })` | `→ filepath` | Click dismiss + wait `{ hidden: true }` on `target` + capture |
   | `waitForAutoCloseAndCapture(page, target, name, { timeout })` | `→ filepath` | Wait `{ hidden: true }` on `target` (for timer-driven dismissals) + capture; pass a `timeout` that comfortably exceeds the component's timer |
   | `waitForStateAndCapture(page, predicateFn, name, { timeout? })` | `→ filepath` | Wait for arbitrary DOM predicate (e.g. `() => document.querySelector('.counter').textContent === '5'`) + capture |

   Defaults: `pad = 200ms`, `timeout = 5000ms`. **Only read `lib.js`'s source if you hit an edge case that doesn't fit any of these helpers** — the table above is the API contract.

Notes for filling in:
- Number screenshot names so the sequence is obvious (`01-`, `02-`, …). Future-you opening `images/` should be able to reconstruct the story from filenames.
- Prefer `data-testid` attributes if the project uses them; otherwise unique class names; otherwise text content via `page.locator('text=...').click()`. Don't target by tag name alone.
- For elements that animate in: use `openModalAndCapture` (`{ visible: true }`). For elements that animate out: use `closeModalAndCapture` or `waitForAutoCloseAndCapture` (`{ hidden: true }`).
- If a flow doesn't fit the helpers, drop down to raw Puppeteer via `page.click`, `page.evaluate`, etc., but keep applying rule 1 (wait for DOM state, not sleep).

### 4. Run

Start the dev server in the background, poll for readiness, run the script, then stop the server.

```bash
# Start dev server (use whatever script the project defines)
npm start &  # or: npm run dev, npm run serve, etc.
DEV_PID=$!

# Poll until reachable — no blind sleeps
until curl -sf http://localhost:3000 > /dev/null 2>&1; do sleep 1; done

# Run the interaction script
CHROME_BIN=/usr/bin/chromium node interact.js

# Stop dev server
kill $DEV_PID 2>/dev/null
```

In Claude Code, prefer running the dev server as a background Bash task (`run_in_background: true`) and the readiness poll as a separate background Bash task — you'll be notified when the poll exits. Stop the dev-server task with `TaskStop` when finished.

### 5. Verify

After the script finishes:

1. `ls -la <project>/images/` to confirm every expected file is present and non-trivially sized. Anything under ~10KB on a 1200x800 viewport is suspect (probably blank).
2. **Open at least 2–3 PNGs with `Read`** — typically the initial state, a mid-flow state, and the final state. Visually confirm they show what the script intended. Filenames lie; pixels don't.
3. Skim the script's stdout for `pageerror:` or `console.error:` lines. Real bugs in the running app show up here first.

If anything looks wrong or a step failed, read `references/troubleshooting.md` — it has a symptom → cause → fix table for every common failure mode.

### 6. Report back

End with a short table mapping numbered screenshots → states they show, plus any caveats discovered (font issues, console errors, animations that needed extra padding). Don't dump every filename in prose — the table makes the sequence scannable.

## Bundled assets

- `assets/lib.js` — interaction helpers. Always use it; the API table above is sufficient to drive it without reading the source.
- `assets/interact.template.js` — minimal driver template using `lib.js`. Copy to project root as `interact.js` and customize.
- `scripts/preflight.sh` — environment detection + remediation for arch mismatches and missing system Chromium.
- `references/troubleshooting.md` — symptom → cause → fix table. Read only when something fails.
- `references/frameworks.md` — mount-selector cheat-sheet per framework. Read only when uncertain.
