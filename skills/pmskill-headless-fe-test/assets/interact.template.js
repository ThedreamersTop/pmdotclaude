// interact.js — pmskill-headless-fe-test driver template
//
// Copy this to the project root, then:
//   1. Set URL to your dev server's address.
//   2. Replace the example interactions in main() with the real ones for your app.
//   3. Gate each screenshot on a real DOM signal (waitForSelector) — not a fixed sleep.
//
// Run with `node interact.js` while the dev server is up.

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const URL = 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, 'images');
const VIEWPORT = { width: 1200, height: 800 };

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function shoot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`saved ${name}.png`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    // Use system Chromium where it exists — Puppeteer's bundled Chrome is often the
    // wrong architecture on ARM hosts. See the skill's environment preflight.
    executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // Surface page-side failures. Without these, JS errors are silent.
    page.on('pageerror', (err) => console.error('pageerror:', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('console.error:', msg.text());
    });

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
    // Wait for *something the app rendered* — proves React/Vue/etc has mounted,
    // not just that the bundle has loaded.
    await page.waitForSelector('body'); // <-- replace with a real app-specific selector

    // ===== BEGIN PROJECT-SPECIFIC INTERACTIONS ============================
    //
    // Replace this block with your app's interactions. Pattern:
    //
    //   1. await shoot(page, 'NN-state-name') — capture initial / current state
    //   2. await page.click('selector')        — drive an interaction
    //   3. await page.waitForSelector(...)     — gate on real DOM change
    //   4. (optional) await sleep(150)         — padding for CSS transitions
    //   5. await shoot(page, 'NN+1-next-state')
    //
    // Number filenames in interaction order so the sequence is obvious from a
    // directory listing.

    await shoot(page, '01-initial');

    // Example: clicking a button and capturing the result.
    //   await page.click('button.primary');
    //   await sleep(150); // CSS transition padding
    //   await shoot(page, '02-after-click');

    // Example: opening a modal, capturing it, closing it.
    //   await page.click('button.open-modal');
    //   await page.waitForSelector('.modal', { visible: true });
    //   await sleep(200);
    //   await shoot(page, '03-modal-open');
    //
    //   await page.click('button.close-modal');
    //   await page.waitForSelector('.modal', { hidden: true, timeout: 5000 });
    //   await shoot(page, '04-modal-closed');

    // ===== END PROJECT-SPECIFIC INTERACTIONS ==============================

    console.log('done');
  } catch (err) {
    console.error('FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
