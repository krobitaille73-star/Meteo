#!/usr/bin/env bash
# post-edit-pr.sh — Triggered after every Edit/Write on index.html.
# Pipeline: security scan → unit tests → stage change (no auto-branch/PR).
# PRs are created manually when a feature is ready.

set -euo pipefail

REPO_DIR="/Users/karinerobitaille/Documents/Meteo"
SECURITY_SCRIPT="$REPO_DIR/.claude/security-scan.sh"
TEST_SCRIPT="$REPO_DIR/.claude/run-tests.sh"
TARGET_FILE="index.html"

# ── 1. Identify which file was changed ───────────────
FILE_PATH=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""' 2>/dev/null)

if [[ "$FILE_PATH" != *"$TARGET_FILE" ]]; then
  exit 0
fi

# ── 2. Security scan (runs first — hard gate) ────────
if ! bash "$SECURITY_SCRIPT"; then
  echo '{"systemMessage":"🚨 SECURITY SCAN FAILED — commit blocked. Fix all violations before proceeding."}'
  exit 0
fi

# ── 3. Unit tests ────────────────────────────────────
if ! bash "$TEST_SCRIPT"; then
  echo '{"systemMessage":"⚠️  Unit tests FAILED — commit blocked. Fix the issues above before proceeding."}'
  exit 0
fi

# ── 4. Check for uncommitted changes ─────────────────
cd "$REPO_DIR"

if git diff --quiet HEAD -- "$TARGET_FILE" 2>/dev/null; then
  echo '{"systemMessage":"✅ Security scan + unit tests passed — no changes to stage."}'
  exit 0
fi

# ── 5. Stage the change on the current branch (no auto-branch, no auto-PR) ──
git add "$TARGET_FILE"

DIFF_STAT=$(git diff --cached --stat | tail -1)
echo "{\"systemMessage\":\"✅ Security scan + unit tests passed — $TARGET_FILE staged ($DIFF_STAT). Commit and PR when ready.\"}"
