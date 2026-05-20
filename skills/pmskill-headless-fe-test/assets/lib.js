// lib.js — interaction helpers for headless frontend screenshot tests.
//
// Copy this file into the project root alongside `interact.js` and require it
// from there. The helpers enforce the non-negotiable patterns from the skill
// (DOM-gating instead of fixed sleeps, error listeners, system Chromium,
// fixed viewport) so the caller writes only the per-app interaction sequence.
//
// Usage (minimal):
//
//   const lib = require('./lib.js');
//   (async () => {
//     const { browser, page } = await lib.launch();
//     await lib.goto(page, 'http://localhost:3000', { mountSelector: '#root > *' });
//
//     await lib.shoot(page, '01-initial');
//     await lib.clickAndCapture(page, 'button.counter', '02-counter-clicked');
//     await lib.openModalAndCapture(page, 'button.open-modal', '.modal-overlay', '03-modal');
//     await lib.closeModalAndCapture(page, 'button.modal-close', '.modal-overlay', '04-modal-closed');
//
//     await browser.close();
//   })().catch((err) => { console.error('FAILED:', err); process.exit(1); });
//
// All helpers gate on DOM state (waitForSelector / waitForFunction) rather
// than sleeping for state changes. The optional `pad` parameter on capture
// helpers is small padding for CSS transitions only — never for state.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DEFAULT_VIEWPORT = { width: 1200, height: 800 };
const DEFAULT_TRANSITION_PAD_MS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolve the screenshot output directory. Honors process.env.IMAGES_DIR,
// otherwise writes to <cwd>/images.
function imagesDir() {
  const dir = process.env.IMAGES_DIR || path.join(process.cwd(), 'images');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Launch Chromium with the flags this skill standardizes on:
//   - explicit executablePath via CHROME_BIN env var (default /usr/bin/chromium)
//     to avoid Puppeteer's bundled-arch trap
//   - --no-sandbox flags for container environments
//   - headless: true
async function launch(opts = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    ...opts,
  });
  const page = await browser.newPage();
  await page.setViewport(opts.viewport || DEFAULT_VIEWPORT);
  // Wire error listeners so page-side failures aren't silent. This is the
  // single biggest reason "the screenshot looks weird and I don't know why."
  page.on('pageerror', (err) => console.error('pageerror:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('console.error:', msg.text());
  });
  return { browser, page };
}

// Navigate to a URL and wait until a known root selector appears, which
// proves the bundle has executed and the framework has mounted. Don't skip
// the mountSelector — `networkidle0` only tells you the network is quiet,
// not that React/Vue/etc. has finished rendering.
async function goto(page, url, opts = {}) {
  const mountSelector = opts.mountSelector;
  await page.goto(url, {
    waitUntil: opts.waitUntil || 'networkidle0',
    timeout: opts.timeout || 30000,
  });
  if (!mountSelector) {
    throw new Error('lib.goto requires mountSelector — read the app first');
  }
  await page.waitForSelector(mountSelector, {
    timeout: opts.mountTimeout || 10000,
  });
}

// Take a viewport screenshot to <imagesDir>/<name>.png.
async function shoot(page, name) {
  const file = path.join(imagesDir(), `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', path.relative(process.cwd(), file));
  return file;
}

// Click a selector and capture the result. `pad` is for CSS transitions only
// — if the click triggers a state change with a visible DOM signal, prefer
// openModalAndCapture / closeModalAndCapture instead.
async function clickAndCapture(page, selector, name, opts = {}) {
  await page.click(selector);
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

// Click a trigger, wait for a target element to become visible, then capture.
// Use for modals, toasts, dropdowns — anything that appears in response to
// the trigger. The visible-wait is what makes this flake-resistant.
async function openModalAndCapture(page, triggerSelector, targetSelector, name, opts = {}) {
  await page.click(triggerSelector);
  await page.waitForSelector(targetSelector, {
    visible: true,
    timeout: opts.timeout || 5000,
  });
  // Small padding for CSS opacity/scale transitions (e.g., fadeIn, popIn).
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

// Click a dismiss control, wait for a target element to become hidden, then
// capture. Use for modal close buttons, dismiss-by-overlay clicks, etc.
async function closeModalAndCapture(page, closeSelector, targetSelector, name, opts = {}) {
  await page.click(closeSelector);
  await page.waitForSelector(targetSelector, {
    hidden: true,
    timeout: opts.timeout || 5000,
  });
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

// Wait for an element to disappear on its own (auto-close timers, async
// dismissals) and capture the resulting state. `timeout` should generously
// exceed the component's auto-close duration.
async function waitForAutoCloseAndCapture(page, targetSelector, name, opts = {}) {
  await page.waitForSelector(targetSelector, {
    hidden: true,
    timeout: opts.timeout || 10000,
  });
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

// Wait until a DOM predicate is true, then capture. Useful for state read
// from the page (e.g., a counter reaching a specific value) when there's no
// element appearing/disappearing.
async function waitForStateAndCapture(page, predicate, name, opts = {}) {
  await page.waitForFunction(predicate, { timeout: opts.timeout || 5000 });
  if (opts.pad !== 0) await sleep(opts.pad ?? 0);
  return shoot(page, name);
}

module.exports = {
  // Setup
  launch,
  goto,
  // Capture primitives
  shoot,
  clickAndCapture,
  openModalAndCapture,
  closeModalAndCapture,
  waitForAutoCloseAndCapture,
  waitForStateAndCapture,
  // Low-level escape hatch
  sleep,
  imagesDir,
};
