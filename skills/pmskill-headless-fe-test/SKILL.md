---
name: pmskill-headless-fe-test
description: Drive a frontend dev server with headless Puppeteer + system Chromium and save numbered screenshots of every UI interaction state into the project's `images/` folder. Use this skill whenever the user wants to take screenshots of the app, visually verify the frontend, capture UI states, screenshot before/after a button click, "play around with" or "interact with" the web page, smoke-test a React/Vue/Svelte/Next/Vite project headlessly, do visual regression captures, or drive the running site with Puppeteer/Playwright — even if they don't say "Puppeteer" explicitly. Trigger on phrases like "spin up the website and take screenshots", "screenshot the popup states", "interact with the app", "capture each state", "visual test the UI", "save screenshots of the page". Also trigger when the user reports the bundled Puppeteer Chrome crashing on an unexpected architecture (e.g. `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`) — the preflight in this skill is the fix.
---

# pmskill-headless-fe-test

Drive a running frontend dev server with headless Chromium under Puppeteer's control, click through its interactive states, and save a numbered PNG per state into `images/`. The screenshots are real compositor output, not HTML-to-canvas reconstructions, so what's saved is exactly what the browser painted.

The skill is reusable across projects. Most steps are deterministic (preflight, server start, server stop); the part that varies — what to click in what order — is encoded in a per-project `interact.js` adapted from the bundled template.

## When to use it

- "Take screenshots of every state of the app"
- "Play around with the page and save images"
- "Spin up the dev server and capture each UI state"
- "Verify the popup looks right"
- "Visual regression / smoke screenshots of the frontend"
- Any time the user describes wanting *image* evidence of UI behavior from a project that has a dev server.

If the user just wants to *run* the dev server with no captures, this skill isn't the right fit — defer to plain `npm start`.

## Workflow

The numbered steps are ordered for safety: project preflight first (so we know we can build), then environment preflight (so we know the browser will launch), then capture, then cleanup.

### 1. Project preflight

Read the project before assuming any commands.

- Open `package.json`. Find the dev-server script — in priority order: `dev`, `start`, `serve`. If multiple exist and they're meaningfully different, ask the user which to use.
- Look at the script's flags to find the port (`--port 3000`, `-p 5173`, etc.) or the dev server's documented default (Vite 5173, Next 3000, webpack-dev-server 3000 unless overridden, Astro 4321, CRA 3000). Save it as `PORT`.
- Check `package.json` `devDependencies` for `puppeteer`. If missing, `npm i -D puppeteer` (or the project's package manager — `pnpm add -D` / `yarn add -D`). Do **not** install `playwright` instead unless the user asks; switching libraries changes the API the template uses.
- Confirm the project actually has interactive UI to capture. Read the entry component (`src/App.{jsx,tsx,vue}`, `app/page.tsx`, etc.) and any obvious child components. Note the **real selectors** — class names, button text, data-testids. Don't guess them; guesses produce silent failures (`page.click` waits forever on a missing selector).

### 2. Environment preflight

Puppeteer ships its own Chrome under `~/.cache/puppeteer/`. On non-x86 hosts (Apple Silicon containers, ARM CI, Raspberry Pi) the cached binary is often the wrong architecture even though the directory name claims otherwise — the launch then fails with messages like `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2`. The fix is to use the OS-native Chromium and tell Puppeteer about it via `executablePath`.

Run the preflight script:

```bash
bash ~/.claude/skills/pmskill-headless-fe-test/scripts/preflight.sh
```

It checks `uname -m` against the cached Chrome's ELF arch with `file`, and if they don't match it installs `chromium` from apt (works on Debian/Ubuntu — the only base images this skill has been hardened against). The script is idempotent and safe to run on every invocation. After it finishes, `/usr/bin/chromium` will exist on ARM hosts and the template's `executablePath` fallback picks it up.

If the host is not Debian/Ubuntu, the script will print what it tried and exit non-zero. In that case, install Chromium / Chrome for the host's package manager and set `CHROME_BIN=/path/to/chromium` in the environment before running the interaction script. Tell the user this rather than silently failing.

Optional emoji fix: if the UI contains emoji and they render as tofu boxes in the screenshots, `sudo apt install -y fonts-noto-color-emoji` adds a color emoji font that headless Chromium will pick up automatically.

### 3. Write the interaction script

Copy the template to the project root and adapt the interaction sequence.

```bash
cp ~/.claude/skills/pmskill-headless-fe-test/assets/interact.template.js ./interact.js
```

Then edit `interact.js`:

- Set `URL` to `http://localhost:${PORT}` from step 1.
- Replace the example interactions (`'01-initial'`, the counter clicks, the popup) with the project's real states. The template has comments marking the swap-out region.
- For each captured state, gate the screenshot on a real DOM signal — `page.waitForSelector('.thing', { visible: true })` after opening a modal, `{ hidden: true }` after dismissing one. The whole point of headless capture is determinism; fixed `sleep()` calls reintroduce flake. Use the bundled `sleep(150)` helper *only* as padding for CSS transitions (slide-in, fade-out) that have no DOM signal of completion.
- Number screenshots in interaction order (`01-`, `02-`, ...) so the sequence is obvious from a `ls` and easy to diff across runs.

#### Selector discovery

The model writing the script must read the relevant source files before writing selectors. Read the entry component and child components for the states being captured, and pick selectors that exist *in the source*. Two patterns work well:

- **`data-testid` attributes** — most stable. If the project already uses them, prefer them.
- **Class names + text content** — works for projects that don't have testids. Use specific class combinations (`button.btn-popup`) rather than generic ones (`button`) to avoid ambiguity.

If a click has no obvious selector (e.g. the third item in a list), `page.evaluate` lets you run arbitrary JS inside the page, which is sometimes cleaner than fighting Puppeteer's selector engine.

### 4. Start dev server and wait for readiness

Start the server in the background — the interaction script can't run against a server that isn't listening yet.

```bash
npm start &   # or: npm run dev, pnpm dev, etc.
SERVER_PID=$!
```

If running this from inside Claude Code, prefer launching the dev-server command with the Bash tool's `run_in_background: true` so notification of completion (crash, port-in-use) reaches you. Note the returned task ID — you'll need it to stop the server cleanly in step 6.

Poll readiness with `curl` in an `until` loop rather than sleeping a fixed amount:

```bash
until curl -sf http://localhost:${PORT} > /dev/null 2>&1; do sleep 1; done
```

Dev-server cold starts vary from 200ms to 30s depending on bundle size and disk cache. Polling adapts to both extremes; a fixed `sleep 10` is either slow or wrong.

### 5. Capture

```bash
node interact.js
```

The template:
- Launches headless Chromium with `--no-sandbox --disable-setuid-sandbox --disable-gpu` (needed in containers, where the Chrome sandbox can't acquire the kernel capabilities it wants).
- Uses `executablePath: process.env.CHROME_BIN || '/usr/bin/chromium'` so it picks up the system browser installed by preflight; falls back to Puppeteer's cache on hosts where the cache is correct.
- Sets a fixed `1200x800` viewport. Fixed dimensions make screenshots comparable across runs.
- Wires `pageerror` and `console.error` listeners so JS errors in the page reach the script's stdout instead of being swallowed.
- Saves PNGs into `./images/` (creates the directory if missing) with `fullPage: false` — viewport captures, not scroll-and-stitch.

If the script throws, read the error before retrying. The most common failure modes:
- `Failed to launch the browser process` — preflight wasn't run or `CHROME_BIN` points somewhere wrong.
- `Waiting for selector \`.foo\` failed: 30000ms exceeded` — wrong selector, or the previous step left the page in an unexpected state. Read the JSX, not the docs.
- `net::ERR_CONNECTION_REFUSED` — readiness loop in step 4 didn't actually finish, or the server crashed; check the server log.

### 6. Stop the dev server

```bash
kill $SERVER_PID 2>/dev/null
```

If you launched via Claude Code's background task tool, use `TaskStop` with the task ID instead — that's the cleaner termination path and avoids orphaned processes.

### 7. Verify

Don't trust that "the script exited 0" means the screenshots look right. Read at least the first, a mid-sequence, and the last PNG and check what's actually in them.

```bash
ls -la images/
```

…then use the file-reading tool to view two or three of the PNGs. Look for:
- The state the filename claims (counter shows N after N clicks, popup is visible/hidden as expected).
- No unexpected error overlays (Next.js error overlay, Vite error overlay).
- No layout shift artifacts (half-rendered components, missing fonts).

If something looks off, the fastest diagnosis is usually to re-run with the script's `pageerror`/`console.error` output piped to stdout — it almost always names the root cause.

## Notes and limits

- This skill assumes the project has an interactive dev server you can hit over HTTP. For pure static-site generators with no dev server, build then serve `dist/` with `npx serve -p $PORT` and proceed the same way.
- The skill is single-browser. It does not test for cross-browser parity; if the user needs Firefox/WebKit coverage too, suggest Playwright instead (similar API, three engines).
- Screenshots are PNGs; expect ~200-400KB each at 1200x800. Don't commit them unless that's the user's intent.
- The interaction script is *not* a test framework. There are no assertions about correctness — only state captures. If the user wants pass/fail signal too, layer on Jest/Vitest or a real visual-diff tool (Playwright's `expect(page).toHaveScreenshot()`, Percy, Chromatic) rather than extending this skill.

## Bundled resources

- `assets/interact.template.js` — Puppeteer driver template; copy to project root and customize.
- `scripts/preflight.sh` — Architecture check + Chromium install on Debian/Ubuntu hosts.
