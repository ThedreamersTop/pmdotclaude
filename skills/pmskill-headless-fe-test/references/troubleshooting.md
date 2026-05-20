# Troubleshooting — `pmskill-headless-fe-test`

Read this only if a screenshot looks wrong, a launch fails, or you see an unexpected error during the workflow. Most successful runs never need it.

## Common failure modes and remedies

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2` | Cached Chrome is x86_64, host is aarch64 | Run `scripts/preflight.sh`; it installs system chromium and prints `CHROME_BIN=/usr/bin/chromium`. `lib.launch()` already honors that env var. |
| `Failed to launch browser process` with no further detail | Missing sandbox capabilities in container | The `--no-sandbox --disable-setuid-sandbox` flags in `lib.launch()` should cover this. Verify the launch options weren't overridden. |
| Screenshot is fully blank | Captured before mount, or bundle 404 | Verify `MOUNT_SELECTOR` exists in the page DOM (open the URL in a real browser, inspect). Check the script's `pageerror:` / `console.error:` lines in stdout. |
| Screenshot shows a half-animated popup / modal | Captured during CSS transition | Bump `{ pad: <ms> }` on the helper, e.g. `openModalAndCapture(page, ..., name, { pad: 400 })`. Default is 200ms. |
| Counter / state value wrong in screenshot | Click fired before React hydrated, or selector hit the wrong element | Prefer `data-testid` if available. For state changes without a clear DOM signal, use `waitForStateAndCapture(page, () => …)` with a DOM predicate. Check `console.error:` for hydration warnings. |
| Emoji render as missing-glyph (tofu) boxes | No emoji font installed | `sudo apt-get install -y fonts-noto-color-emoji`. Cosmetic only — page logic is unaffected. |
| `waitForSelector` times out on `{ hidden: true }` for an auto-close | Timer is longer than your timeout | Read the component, find the `setTimeout` duration, then pass `{ timeout: that + buffer }` to `waitForAutoCloseAndCapture`. |
| `EADDRINUSE` on the dev-server port | Stale dev server from a previous run | `lsof -i :<port>` to find the PID, kill it. If you can't free the port, set `PORT=<unused>` and pass `--port` explicitly when the project's start script doesn't honor `PORT`. |
| `interact.js` crashes with `require is not defined` or "Cannot use import statement outside a module" | Project's `package.json` has `"type": "module"` (e.g., Vite scaffolds) | Rename `interact.js` → `interact.cjs` and `lib.js` → `lib.cjs`. Update the `require('./lib.js')` path in the driver accordingly. No code changes needed. |
| Dev server starts but `curl http://localhost:<port>` hangs | Server is binding to IPv6 or a different interface | Try `curl http://127.0.0.1:<port>` instead. Some webpack configs default to `::1`. |

## When the failure isn't on this list

1. Re-read the script's full stdout — `pageerror:` / `console.error:` listeners catch most app-side issues that filenames don't reveal.
2. Open one of the PNGs with `Read` — visual inspection often reveals the cause faster than text-based debugging.
3. If `lib.launch()` itself is suspect, drop down to raw Puppeteer in a 5-line debug script to isolate whether the issue is browser-launch or interaction logic.
