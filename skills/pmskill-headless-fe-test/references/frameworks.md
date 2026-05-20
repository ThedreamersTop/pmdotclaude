# Framework mount-selector cheat-sheet

Step 3 of the workflow asks you to set `MOUNT_SELECTOR` to something the app *actually* renders, so `lib.goto(...)` can confirm the framework has mounted before the first screenshot is taken. Use this only if you're not sure what to put.

| Framework | DOM root | Suggested `MOUNT_SELECTOR` |
|-----------|----------|----------------------------|
| React (CRA / webpack) | `<div id="root">` | `#root > *` |
| React (Vite default template) | `<div id="root">` | `#root > *` |
| Vue (Vue CLI / Vite) | `<div id="app">` | `#app > *` |
| Svelte / SvelteKit | varies — check the project's `app.html` | use the top-level element it specifies |
| Next.js (pages router) | `<div id="__next">` | `#__next > *` |
| Next.js (app router) | `<body>` direct children | `body > main` (or a known layout class) |
| Plain HTML / vanilla JS | varies | a known content element such as `main` or a specific class |

## Picking a selector when the framework is unknown

1. Read the app's entry HTML (`public/index.html`, `index.html`, `app.html`, or the framework's template).
2. Find the element the framework mounts into (search for `getElementById('...')` in `src/index.*` or `src/main.*`).
3. Prefer `<root> > *` (a child of the mount point exists only after mount) over `<root>` (always exists, even before mount). The whole point of `MOUNT_SELECTOR` is to wait until the *framework's output* lands.
4. If the project has a project-specific root class (e.g., `.app-root`, `.dashboard`, `.shell`), use that — it's more semantic than `#root > *`.

## Why this matters

`page.goto(url, { waitUntil: 'networkidle0' })` only tells you the network has gone quiet, not that React/Vue/Svelte has finished rendering. Without `MOUNT_SELECTOR`, the first screenshot can fire before hydration completes and you get a blank or unstyled capture.
