#!/bin/bash
set -euo pipefail

TARGET="$HOME/.claude/skills/library"
REPO="https://github.com/ThedreamersTop/pmAgentLib"

if [ -d "$TARGET" ]; then
  if [ -d "$TARGET/.git" ]; then
    echo "pmAgentLib already installed at $TARGET"
    exit 0
  fi

  if [ -z "$(find "$TARGET" -mindepth 1 -not -name README.md -not -name .gitkeep -print -quit)" ]; then
    echo "Replacing empty/placeholder skills/library directory with pmAgentLib..."
    rm -rf "$TARGET"
  else
    echo "Target exists but is not a git repo or placeholder-only directory: $TARGET"
    echo "Move it aside or remove it before installing pmAgentLib."
    exit 1
  fi
fi

if ! git clone "$REPO" "$TARGET" 2>&1; then
  echo ""
  echo "Clone failed. If this is a private repository, authenticate first:"
  echo ""
  echo "  gh auth login"
  echo ""
  exit 1
fi

echo "pmAgentLib installed to $TARGET"
