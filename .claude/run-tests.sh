#!/usr/bin/env bash
# run-tests.sh — Unit tests for index.html
# Exit 0 = all pass, Exit 1 = one or more failures

FILE="/Users/karinerobitaille/Documents/Meteo/index.html"
PASS=0
FAIL=0
RESULTS=()

check() {
  local desc="$1"
  local pattern="$2"
  if grep -qE "$pattern" "$FILE"; then
    RESULTS+=("  ✅  $desc")
    ((PASS++))
  else
    RESULTS+=("  ❌  $desc")
    ((FAIL++))
  fi
}

check_absent() {
  local desc="$1"
  local pattern="$2"
  # Strip full comment lines AND inline comments so patterns inside // ... don't count
  if ! grep -v '^\s*//' "$FILE" | sed 's|//.*||g' | grep -qE "$pattern"; then
    RESULTS+=("  ✅  $desc")
    ((PASS++))
  else
    RESULTS+=("  ❌  $desc  (forbidden pattern found)")
    ((FAIL++))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧪  Weather Dashboard — Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Structure ──────────────────────────────────────
check        "DOCTYPE declaration present"                  "<!DOCTYPE html>"
check        "UTF-8 charset meta tag"                       'charset="UTF-8"'
check        "Viewport meta tag"                            "name=\"viewport\""
check        "<html lang> attribute set"                    '<html lang='
check        "Page has a <title>"                           "<title>"

# ── Security ───────────────────────────────────────
check        "Content-Security-Policy meta tag present"     "Content-Security-Policy"
check        "CSP default-src 'none'"                       "default-src 'none'"
check        "CSP restricts connect-src to known APIs"      "connect-src.*open-meteo"
check        "CSP restricts img-src to wikimedia"           "img-src.*wikimedia"
check        "X-Content-Type-Options nosniff"               "nosniff"
check        "Referrer policy no-referrer"                  "no-referrer"
check        "Input has maxlength"                          "maxlength="
check        "isSafeImageUrl validation function present"   "isSafeImageUrl"
check        "URL protocol validated (https:)"              "protocol.*https"
check        "Hostname allowlist for wikimedia"             "wikimedia\.org"
check        "Single-quote CSS escape on bg URL"            "replace.*%27"
check        "isFinite guard on API numbers"                "isFinite"

# ── XSS: no innerHTML with external data ──────────
check_absent "No innerHTML assignment (use DOM methods)"    'innerHTML\s*='

# ── Day / Night icons ──────────────────────────────
check        "is_day field requested from API"              "is_day"
check        "getCondition accepts isDay parameter"         "getCondition.*isDay|isDay.*getCondition"
check        "Night moon icon present (🌙)"                "🌙"
check        "Day sun icon present (☀️)"                   "☀️"
check        "WMO entry has 3 fields (label+day+night)"    "\['.+',\s*'[^']+',\s*'[^']+'\]"
check        "is_day validated as Number before use"        "Number.*is_day|is_day.*Number"

# ── Functionality ──────────────────────────────────
check        "Open-Meteo geocoding API URL"                 "geocoding-api\.open-meteo\.com"
check        "Open-Meteo forecast API URL"                  "api\.open-meteo\.com/v1/forecast"
check        "Wikipedia API for city photo"                 "en\.wikipedia\.org/api/rest_v1"
check        "WMO weather code map present"                 "WMO_CODES"
check        "Temperature field fetched"                    "temperature_2m"
check        "Humidity field fetched"                       "relative_humidity_2m"
check        "Wind speed field fetched"                     "wind_speed_10m"
check        "Weather code field fetched"                   "weather_code"
check        "encodeURIComponent used on user input"        "encodeURIComponent"
check        "Enter key triggers search"                    "key.*Enter"
check        "Error state shown to user"                    "showError"
check        "Loading spinner present"                      "spinner"
check        "Forecast render function present"             "renderForecast"
check        "DOM construction uses createElement"          "createElement"
check        "DOM text set via textContent"                 "textContent"
check        "Background image set on success"             "backgroundImage"

# ── Layout ─────────────────────────────────────────
check        "Full-screen body (100vh)"                    "100vh"
check        "Full-screen body (100vw)"                    "100vw"
check        "html,body height 100%"                       "html.*body.*\{.*height.*100%|height.*100%.*\}.*html.*body"
check        "Dark overlay pseudo-element (::before)"      "::before"
check        "Glassmorphism card (backdrop-filter)"        "backdrop-filter"
check        "Responsive grid for forecast"                "grid-template-columns"

# ── Summary ────────────────────────────────────────
echo ""
for r in "${RESULTS[@]}"; do echo "$r"; done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

[ "$FAIL" -eq 0 ]
