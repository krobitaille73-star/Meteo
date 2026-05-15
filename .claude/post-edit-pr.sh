#!/usr/bin/env bash
# post-edit-pr.sh — Triggered after every Edit/Write on index.html.
# Pipeline: security scan → unit tests → commit → PR
# Any failure aborts the pipeline and reports to Claude.

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
  echo '{"systemMessage":"🚨 SECURITY SCAN FAILED — PR blocked. Fix all violations before pushing."}'
  exit 0
fi

# ── 3. Unit tests ────────────────────────────────────
if ! bash "$TEST_SCRIPT"; then
  echo '{"systemMessage":"⚠️  Unit tests FAILED — PR not created. Fix the issues above before pushing."}'
  exit 0
fi

# ── 4. Check for uncommitted changes ─────────────────
cd "$REPO_DIR"

if git diff --quiet HEAD -- "$TARGET_FILE" 2>/dev/null; then
  exit 0
fi

# ── 5. Branch → commit → push → PR ──────────────────
BRANCH="fix/auto-$(date +%Y%m%d-%H%M%S)"
BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null \
  | sed 's@^refs/remotes/origin/@@' || echo "main")

git checkout -b "$BRANCH"
git add "$TARGET_FILE"

DIFF_STAT=$(git diff --cached --stat | tail -1)
git commit -m "$(cat <<EOF
Auto: update $TARGET_FILE — security scan + unit tests passed

Security scan : 41/41 checks passed ✅
Unit tests    : all checks passed ✅
Change summary: $DIFF_STAT

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"

git push -u origin "$BRANCH"

PR_URL=$(gh pr create \
  --base "$BASE_BRANCH" \
  --title "Fix: update weather dashboard (security-scanned + unit-tested)" \
  --body "$(cat <<'EOF'
## Automated quality gate

This PR was created only after **both** pipelines passed:

### 🔒 Security scan — 41/41 checks
| Category | Checks |
|---|---|
| Injection sinks | No eval, new Function, document.write, innerHTML, outerHTML, insertAdjacentHTML |
| Prototype safety | No __proto__, constructor[], Object.prototype mutation |
| URL safety | No javascript:, data: URIs, unvalidated location.href, plain HTTP fetch |
| HTML event handlers | No onclick=, onerror=, onload=, onmouseover= in markup |
| External resources | No external <script src>, no CDN stylesheets, no <iframe> |
| CSP strength | default-src none, no unsafe-eval, no wildcards, nosniff, no-referrer |
| Secrets | No hardcoded API keys, passwords, or console.log |
| Input validation | maxlength, encodeURIComponent, isFinite, Number(), isSafeImageUrl |
| DOM clobbering | No ids/names that shadow location/document/window |

### 🧪 Unit tests — 62/62 checks
Structure · Security · Day/Night icons · New widgets · Layout

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | grep "https://")

echo "{\"systemMessage\":\"✅ Security scan (41/41) + unit tests passed — PR created: $PR_URL\"}"
