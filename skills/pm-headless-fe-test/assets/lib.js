// lib.js — interaction helpers for headless frontend screenshot tests.
// API surface is documented in the parent skill's SKILL.md (§3). The
// inline comments below preserve only the *why* behind each design choice;
// signatures and usage are in the SKILL.md table.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const DEFAULT_VIEWPORT = { width: 1200, height: 800 };
const DEFAULT_TRANSITION_PAD_MS = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function imagesDir() {
  const dir = process.env.IMAGES_DIR || path.join(process.cwd(), 'images');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// executablePath via CHROME_BIN avoids Puppeteer's bundled-arch trap
// (the cache is x86_64 on aarch64 containers). --no-sandbox flags are
// needed because containers usually can't grant the sandbox's caps.
async function launch(opts = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    ...opts,
  });
  const page = await browser.newPage();
  await page.setViewport(opts.viewport || DEFAULT_VIEWPORT);
  // pageerror + console.error listeners — without them, JS errors in the
  // running app are silent and screenshots just "look weird".
  page.on('pageerror', (err) => console.error('pageerror:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('console.error:', msg.text());
  });
  return { browser, page };
}

// networkidle0 alone is not enough — it confirms the network is quiet,
// not that the framework has mounted. Always gate on mountSelector.
async function goto(page, url, opts = {}) {
  if (!opts.mountSelector) {
    throw new Error('lib.goto requires mountSelector — read the app first');
  }
  await page.goto(url, {
    waitUntil: opts.waitUntil || 'networkidle0',
    timeout: opts.timeout || 30000,
  });
  await page.waitForSelector(opts.mountSelector, {
    timeout: opts.mountTimeout || 10000,
  });
}

async function shoot(page, name) {
  const file = path.join(imagesDir(), `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', path.relative(process.cwd(), file));
  return file;
}

// `pad` is for CSS transitions only — never for state changes. If a
// click produces a DOM signal, prefer openModal/closeModalAndCapture.
async function clickAndCapture(page, selector, name, opts = {}) {
  await page.click(selector);
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

async function openModalAndCapture(page, triggerSelector, targetSelector, name, opts = {}) {
  await page.click(triggerSelector);
  await page.waitForSelector(targetSelector, {
    visible: true,
    timeout: opts.timeout || 5000,
  });
  // Small pad covers fadeIn / popIn — the visible wait only guarantees
  // the element is in the DOM with nonzero size, not that opacity is 1.
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

async function closeModalAndCapture(page, closeSelector, targetSelector, name, opts = {}) {
  await page.click(closeSelector);
  await page.waitForSelector(targetSelector, {
    hidden: true,
    timeout: opts.timeout || 5000,
  });
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

async function waitForAutoCloseAndCapture(page, targetSelector, name, opts = {}) {
  await page.waitForSelector(targetSelector, {
    hidden: true,
    timeout: opts.timeout || 10000,
  });
  if (opts.pad !== 0) await sleep(opts.pad ?? DEFAULT_TRANSITION_PAD_MS);
  return shoot(page, name);
}

async function waitForStateAndCapture(page, predicate, name, opts = {}) {
  await page.waitForFunction(predicate, { timeout: opts.timeout || 5000 });
  if (opts.pad !== 0) await sleep(opts.pad ?? 0);
  return shoot(page, name);
}

module.exports = {
  launch,
  goto,
  shoot,
  clickAndCapture,
  openModalAndCapture,
  closeModalAndCapture,
  waitForAutoCloseAndCapture,
  waitForStateAndCapture,
  // low-level escape hatches
  sleep,
  imagesDir,
};
