#!/bin/bash

TARGET="$HOME/.claude/skills/library"

if [ -d "$TARGET" ]; then
  echo "pmAgentLib already installed at $TARGET"
  exit 0
fi

git clone https://github.com/ThedreamersTop/pmAgentLib "$TARGET" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "Clone failed. If this is a private repository, authenticate first:"
  echo ""
  echo "  gh auth login"
  echo ""
  exit $EXIT_CODE
fi

echo "pmAgentLib installed to $TARGET"
