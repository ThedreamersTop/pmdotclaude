// interact.template.js — copy to project root alongside lib.js, then
// customize the interactions block for the app under test.
//
// The helpers in lib.js enforce the three non-negotiable patterns
// (DOM-gating, system Chromium, error listeners) by construction, so this
// file stays small and focused on the per-app interaction sequence.

const lib = require('./lib.js');

const URL = process.env.APP_URL || 'http://localhost:3000';
// Mount selector that proves the framework has rendered. Pick something
// the app actually outputs — e.g., '#root > *' for React, '#app > *' for Vue,
// a top-level class like '.app-root' or a known component selector.
const MOUNT_SELECTOR = '.app-root';

(async () => {
  const { browser, page } = await lib.launch();
  try {
    await lib.goto(page, URL, { mountSelector: MOUNT_SELECTOR });

    // ===== INTERACTIONS — customize from here =====

    await lib.shoot(page, '01-initial');

    // Click and capture (the click result has no DOM signal that's easy to
    // wait on — e.g., a counter increment is just a text change). The small
    // default pad covers any CSS transition on the click.
    // await lib.clickAndCapture(page, '[data-testid="primary-cta"]', '02-after-cta');

    // Open a modal: clicks the trigger, waits for the modal to be visible.
    // await lib.openModalAndCapture(page, '[data-testid="open-modal"]',
    //                                '.modal-overlay', '03-modal-open');

    // Close a modal: clicks the close control, waits for the modal to be hidden.
    // await lib.closeModalAndCapture(page, '[data-testid="modal-close"]',
    //                                 '.modal-overlay', '04-modal-closed');

    // Auto-close (timer-driven dismiss). Timeout should exceed the component's
    // auto-close duration with a small buffer.
    // await lib.openModalAndCapture(page, '[data-testid="toast-trigger"]',
    //                                '.toast', '05-toast-shown');
    // await lib.waitForAutoCloseAndCapture(page, '.toast', '06-toast-auto-closed',
    //                                       { timeout: 5000 });

    // State-based wait (no element appears/disappears; just a DOM value
    // changes). Useful for counters reaching a known value, content load
    // completion flags, etc.
    // await lib.waitForStateAndCapture(page,
    //   () => document.querySelector('.counter').textContent === '5',
    //   '07-counter-five');

    // ===== END INTERACTIONS =====

    console.log('done');
  } catch (err) {
    console.error('FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
