#!/usr/bin/env bash
# preflight.sh — pm-headless-fe-test
#
# Ensures a runnable Chromium exists for Puppeteer to launch.
#
# Why this is needed: Puppeteer's `npm install` downloads its own Chrome into
# ~/.cache/puppeteer/. On ARM hosts that download is often the wrong arch
# anyway — the directory name lies. Launching it then fails with messages like
#   "rosetta error: failed to open elf at /lib64/ld-linux-x86-64.so.2".
# The fix is the OS-native Chromium plus an `executablePath` override in the
# interaction script (the template already has that override).
#
# This script is idempotent — safe to run on every invocation.

set -u

log() { printf '[preflight] %s\n' "$*"; }
err() { printf '[preflight] ERROR: %s\n' "$*" >&2; }

HOST_ARCH="$(uname -m)"
log "host arch: ${HOST_ARCH}"

# If system chromium already exists and runs, we're done.
if command -v chromium >/dev/null 2>&1; then
  if chromium --version >/dev/null 2>&1; then
    log "system chromium present: $(chromium --version 2>/dev/null)"
    exit 0
  fi
fi
if command -v chromium-browser >/dev/null 2>&1; then
  if chromium-browser --version >/dev/null 2>&1; then
    log "system chromium-browser present: $(chromium-browser --version 2>/dev/null)"
    exit 0
  fi
fi

# Check the Puppeteer cache to see whether its bundled Chrome is even usable on
# this host. If it is, we don't need to install anything.
CACHED_CHROME="$(ls ~/.cache/puppeteer/chrome/*/chrome*/chrome 2>/dev/null | head -1 || true)"
if [ -n "${CACHED_CHROME}" ] && [ -x "${CACHED_CHROME}" ]; then
  ARCH_LINE="$(file "${CACHED_CHROME}" 2>/dev/null || true)"
  log "cached chrome: ${CACHED_CHROME}"
  log "cached chrome file: ${ARCH_LINE}"
  case "${HOST_ARCH}" in
    aarch64|arm64)
      if echo "${ARCH_LINE}" | grep -qE 'aarch64|ARM aarch64'; then
        log "cached chrome arch matches host (arm64) — Puppeteer's bundled Chrome will work"
        exit 0
      fi
      ;;
    x86_64|amd64)
      if echo "${ARCH_LINE}" | grep -qE 'x86-64|x86_64'; then
        log "cached chrome arch matches host (x86_64) — Puppeteer's bundled Chrome will work"
        exit 0
      fi
      ;;
  esac
  log "cached chrome arch mismatch — will install system chromium"
fi

# Need to install. Currently we know how to do this on Debian/Ubuntu only.
if ! command -v apt-get >/dev/null 2>&1; then
  err "no apt-get on this host — cannot auto-install Chromium."
  err "install Chromium or Chrome manually for your OS, then set CHROME_BIN to its path."
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  err "no sudo on this host — cannot install system Chromium."
  err "run \`apt-get install -y chromium\` as root, or set CHROME_BIN."
  exit 1
fi

log "installing system chromium via apt..."
if ! sudo -n true 2>/dev/null; then
  err "sudo requires a password in this environment — run \`sudo apt-get install -y chromium\` manually and re-run."
  exit 1
fi

# Refresh index quietly; tolerate one transient failure.
sudo apt-get update -y >/dev/null 2>&1 || sudo apt-get update -y >/dev/null 2>&1 || true

if ! sudo apt-get install -y chromium >/dev/null 2>&1; then
  err "apt-get install chromium failed."
  err "try \`sudo apt-get install -y chromium-browser\` (Ubuntu sometimes uses that name)."
  exit 1
fi

if command -v chromium >/dev/null 2>&1; then
  log "installed: $(chromium --version 2>/dev/null)"
  exit 0
fi

err "chromium not on PATH after install — investigate manually."
exit 1
