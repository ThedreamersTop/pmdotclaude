---
name: pmskill-headless-fe-test
description: Drive a frontend dev server with headless Puppeteer + system Chromium and save numbered screenshots of every UI interaction state into the project's `images/` folder. Use this skill whenever the user wants to take screenshots of the app, visually verify the frontend, capture UI states, screenshot before/after a button click, "play around with" or "interact with" the web page, smoke-test a React/Vue/Svelte/Next/Vite project headlessly, do visual regression captures, or drive the running site with Puppeteer/Playwright — even if they don't say "Puppeteer" explicitly. Trigger on phrases like "spin up the website and take screenshots", "screenshot the popup states", "interact with the app", "capture each state", "visual test the UI", "save screenshots of the page". Also trigger when the user reports the bundled Puppeteer Chrome crashing on an unexpected architecture (e.g. `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`) — the preflight in this skill is the fix.
---

# Headless Frontend Test & Screenshot

Drive a project's frontend through a sequence of user interactions in a headless browser and save a screenshot of each state. The goal is fast visual confirmation that the app renders and behaves correctly — not pixel-perfect regression testing.

## When to use vs. when not to

Use when: the user wants to *see* the app at multiple states, has just built or changed UI, or wants visual evidence a feature works end-to-end through a real browser. Also use when explicitly asked to "play around with" or "exercise" the app.

Don't use when: the user only wants unit/component tests (use Jest, Vitest, etc.), only wants a static snapshot of a single state with no interaction (a one-line `curl` or `page.screenshot` is enough), or the project already has a Playwright/Cypress suite the user wants you to extend — use those instead.

## Non-negotiable patterns

Three rules. Skipping any of them is the difference between a reliable run and intermittent, hard-to-diagnose flake. The bundled `lib.js` enforces all three by construction — use it and you cannot violate them by accident.

1. **Gate on DOM state, never on `sleep` for state changes.** When an action causes something to appear/disappear/update, wait for the matching `page.waitForSelector({ visible: true | hidden: true })` or `page.waitForFunction(...)`. Reserve `sleep` (≤500ms) strictly as padding for CSS transitions where there is no DOM signal — never as a proxy for "give the app a moment."
   *Reason:* animations, async fetches, and React/Vue reconciliation all have unpredictable timing. A fixed sleep is a race condition you're paying for in dollars — intermittently it captures half-loaded frames, and the failure is silent (you get a PNG, just the wrong one). This is the single most common way these tests go wrong, and the only assertion that meaningfully discriminated this skill from a bare-Claude baseline in benchmarking.

2. **Always set `executablePath` to a system Chromium.** Use `executablePath: process.env.CHROME_BIN || '/usr/bin/chromium'` in `puppeteer.launch`. `lib.launch()` already does this. Never let Puppeteer fall back to its bundled cache without first verifying the cached binary's arch matches the host.
   *Reason:* the cached Chrome under `~/.cache/puppeteer/` is frequently the wrong architecture (especially aarch64 containers where Puppeteer ships x86-64). Launching it fails with `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2` — confusing if you've never seen it.

3. **Wire `pageerror` and `console.error` listeners on every page.** `lib.launch()` does this. Don't open a page without them.
   *Reason:* without these, JS errors in the running app are invisible. The screenshot just "looks weird" and you have no signal as to why.

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

If preflight fails (e.g., no apt, no sudo, non-Debian distro), tell the user explicitly: "I cannot launch a headless browser in this environment because <reason>." Do not silently fall back to an unrelated method.

Optional: if the app's UI uses emoji and you care about them rendering, `sudo apt-get install -y fonts-noto-color-emoji`. Otherwise emoji render as tofu boxes — page logic is unaffected.

### 3. Write the interaction script

The skill bundles two files in `assets/`:

- **`lib.js`** — interaction helpers. Use them; they enforce the three non-negotiable patterns above. Copy this verbatim into the project root.
- **`interact.template.js`** — a minimal driver script that calls `lib.js`. Copy to the project root as `interact.js`, then customize the interactions block.

```bash
cp <path-to-skill>/assets/lib.js               <project-root>/lib.js
cp <path-to-skill>/assets/interact.template.js <project-root>/interact.js
```

Then customize `interact.js` for the app:

1. Set `MOUNT_SELECTOR` to something the app actually renders (e.g., `#root > *` for most React apps, `#app > *` for Vue, a known component class like `.app-root`).
2. Replace the example interactions with the real ones, picking the right helper for each:
   - `shoot(page, name)` — capture current state without any action (e.g., initial render)
   - `clickAndCapture(page, selector, name)` — click and capture; for state changes without a clear DOM signal (counter increment, hover effect)
   - `openModalAndCapture(page, trigger, target, name)` — click a trigger, wait for `target` to become **visible**, capture
   - `closeModalAndCapture(page, closeBtn, target, name)` — click a dismiss, wait for `target` to become **hidden**, capture
   - `waitForAutoCloseAndCapture(page, target, name, { timeout })` — wait for `target` to disappear on its own (timers), capture
   - `waitForStateAndCapture(page, predicate, name)` — wait for an arbitrary DOM predicate (e.g., counter value), capture

Notes for filling in:
- Number the screenshots so the sequence is obvious by filename (`01-`, `02-`, …). Future-you opening `images/` should be able to reconstruct the story.
- Prefer `data-testid` attributes if the project uses them; otherwise unique class names; otherwise text content via `page.locator('text=...').click()`. Don't target by tag name alone.
- For elements that animate in: use `openModalAndCapture` (waits for `{ visible: true }`). For elements that animate out: use `closeModalAndCapture` or `waitForAutoCloseAndCapture` (waits for `{ hidden: true }`). For auto-close, set a `timeout` that comfortably exceeds the component's timer.
- If a flow doesn't fit the helpers, drop down to raw Puppeteer via `page.evaluate`, `page.click`, etc., but keep applying rule 1 (wait for DOM state, not sleep).

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

If any screenshot looks wrong:
- Blank or unstyled → bundle didn't load. Check `MOUNT_SELECTOR` actually exists in the rendered app.
- Cut-off animation → bump the `pad` option on the relevant helper (`openModalAndCapture(page, ..., name, { pad: 400 })`).
- Wrong state captured → selector matched the wrong element. Re-read the JSX/HTML.

### 6. Report back

End with a short table mapping numbered screenshots → states they show, plus any caveats discovered (font issues, console errors, animations that needed extra padding). Don't dump every filename in prose — the table makes the sequence scannable.

## Bundled assets

- `assets/lib.js` — interaction helpers. Enforces DOM-gating, system Chromium, error listeners by construction. Copy verbatim into the project. **Always use it unless an edge case truly doesn't fit.**
- `assets/interact.template.js` — minimal driver template using `lib.js`. Copy to the project root as `interact.js` and customize the interactions block.
- `scripts/preflight.sh` — environment detection + remediation for arch mismatches and missing system Chromium. Invoke once per environment.

## Common failure modes and remedies

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2` | Cached Chrome is x86_64, host is aarch64 | Run preflight; install system chromium; rely on `lib.launch()` defaults |
| `Failed to launch browser process` with no further detail | Missing sandbox capabilities in container | The `--no-sandbox` flags in `lib.launch()` should cover this |
| Screenshot is fully blank | Captured before mount, or bundle 404 | Verify `MOUNT_SELECTOR` exists in the page DOM; check the script's `pageerror` logs |
| Screenshot shows half-animated popup | Captured during CSS transition | Bump `{ pad: <ms> }` on the helper, or wait on a more specific selector |
| Counter/state value wrong in screenshot | Click fired before React rehydration, or selector hit the wrong button | Use `data-testid` if available; check `console.error` for hydration warnings |
| Emoji render as missing-glyph boxes | No emoji font installed | `sudo apt-get install -y fonts-noto-color-emoji` (optional; cosmetic only) |
| `waitForSelector` times out on `{ hidden: true }` for auto-close | Timer is longer than your timeout | Read the component, find the `setTimeout` duration, set `{ timeout: that + buffer }` |
