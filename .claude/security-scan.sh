#!/usr/bin/env bash
# security-scan.sh — Static security audit for index.html
# Runs BEFORE unit tests. Exit 0 = clean, Exit 1 = violations found.
# All checks strip comment-only lines and inline comments to avoid false positives.

FILE="/Users/karinerobitaille/Documents/Meteo/index.html"
PASS=0
FAIL=0
RESULTS=()

# Strip comments before scanning (avoid matching patterns inside // ... comments)
STRIPPED=$(grep -v '^\s*//' "$FILE" | sed 's|//.*||g')

ok()   { RESULTS+=("  ✅  $1"); ((PASS++)); }
fail() { RESULTS+=("  🚨  $1"); ((FAIL++)); }

absent() {
  # $1 = description, $2 = ERE pattern that must NOT appear in real code
  if echo "$STRIPPED" | grep -qE "$2"; then
    fail "$1"
  else
    ok "$1"
  fi
}

present() {
  # $1 = description, $2 = ERE pattern that MUST appear somewhere in the file
  if grep -qE "$2" "$FILE"; then
    ok "$1"
  else
    fail "$1"
  fi
}

csp_absent() {
  # $1 = description, $2 = pattern that must NOT appear inside the CSP meta tag value
  local csp
  csp=$(grep -i "Content-Security-Policy" "$FILE" | head -1)
  if echo "$csp" | grep -qE "$2"; then
    fail "$1"
  else
    ok "$1"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔒  Security Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Injection sinks ────────────────────────────────────────
absent  "No eval() calls"                              '\beval\s*\('
absent  "No new Function() constructor"                'new\s+Function\s*\('
absent  "No document.write/writeln"                    'document\.write(ln)?\s*\('
absent  "No setTimeout/setInterval with string arg"    '(setTimeout|setInterval)\s*\(\s*[`"'"'"']'
absent  "No with() statement"                          '\bwith\s*\('
absent  "No innerHTML assignment"                      'innerHTML\s*='
absent  "No outerHTML assignment"                      'outerHTML\s*='
absent  "No insertAdjacentHTML"                        'insertAdjacentHTML\s*\('
absent  "No dangerouslySetInnerHTML"                   'dangerouslySetInnerHTML'

# ── 2. Prototype / object pollution ──────────────────────────
absent  "No __proto__ manipulation"                    '__proto__'
absent  "No constructor[] access"                      '\[.constructor.\]'
absent  "No Object.prototype assignment"               'Object\.prototype\.'

# ── 3. URL / navigation safety ───────────────────────────────
absent  "No javascript: protocol URLs"                 'javascript\s*:'
absent  "No data: URIs in src/href attributes"         '(src|href)\s*=\s*["\x27]data:'
absent  "No unvalidated location.href assignment"      'location\.href\s*=[^=]'
absent  "No HTTP (non-TLS) fetch calls"                "fetch\s*\(\s*['\"]http://"
absent  "No HTTP (non-TLS) image src"                  "img\.src\s*=\s*['\"]http://"

# ── 4. Inline event handlers in HTML ─────────────────────────
absent  "No onclick= attribute in HTML"                'onclick\s*='
absent  "No onerror= attribute in HTML"                'onerror\s*='
absent  "No onload= attribute in HTML (outside meta)"  '<[^m][^e][^t][^a][^>]*onload\s*='
absent  "No onmouseover= attribute"                    'onmouseover\s*='

# ── 5. External resource loading ─────────────────────────────
absent  "No external <script src=>"                    '<script[^>]+src\s*='
absent  "No external <link rel=stylesheet> (CDN)"      '<link[^>]+href\s*=\s*["\x27]https?://'
absent  "No <iframe> elements"                         '<iframe'

# ── 6. CSP strength ──────────────────────────────────────────
present "CSP meta tag present"                         'Content-Security-Policy'
present "CSP default-src none"                         "default-src 'none'"
csp_absent "CSP does not use unsafe-eval"              'unsafe-eval'
csp_absent "CSP does not use wildcard * in connect-src" "connect-src[^;]*\*"
csp_absent "CSP does not allow all img origins"        "img-src\s+\*"
present "X-Content-Type-Options nosniff present"       'nosniff'
present "Referrer no-referrer present"                 'no-referrer'

# ── 7. Sensitive data leakage ────────────────────────────────
absent  "No hardcoded API keys (Bearer token pattern)" 'Bearer\s+[A-Za-z0-9+/]{20,}'
absent  "No hardcoded passwords"                       '(password|passwd|secret)\s*=\s*["\x27][^"\x27]{4,}'
absent  "No console.log left in production code"       'console\.(log|warn|error|debug)\s*\('

# ── 8. Input validation ──────────────────────────────────────
present "User input length capped (maxlength)"         'maxlength='
present "User input encoded before fetch"              'encodeURIComponent'
present "API numbers validated with isFinite"          'isFinite'
present "API numbers coerced with Number()"            'Number\('
present "Image URLs validated before use"              'isSafeImageUrl'

# ── 9. DOM clobbering surface ────────────────────────────────
absent  "No id=location or id=document in HTML"        'id\s*=\s*["\x27](location|document|window|top)["\x27]'
absent  "No name= on inputs that shadow globals"       'name\s*=\s*["\x27](location|document|window)["\x27]'

# ── Summary ──────────────────────────────────────────────────
echo ""
for r in "${RESULTS[@]}"; do echo "$r"; done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "  Security: %d passed, %d failed\n" "$PASS" "$FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

[ "$FAIL" -eq 0 ]
