#!/usr/bin/env bash
# RV Files attack demo: exercises the file-safety, quota, revoke and tripwire controls.
# Usage: BASE_URL=http://localhost:3001 [FAST=1] scripts/attack-demo.sh
# Exit code = number of failed checks.
set -u

BASE_URL="${BASE_URL:-http://localhost:3001}"
API="${BASE_URL%/}/api"
FAST="${FAST:-0}"

command -v curl >/dev/null || { echo "curl required"; exit 99; }
command -v jq >/dev/null || { echo "jq required"; exit 99; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
JAR_A="$TMP/a.jar"
JAR_B="$TMP/b.jar"
BODY="$TMP/body.json"
HDRS="$TMP/headers.txt"

if [ -t 1 ]; then
  GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; YELLOW=""; BOLD=""; RESET=""
fi

PASSED=0; FAILED=0; SKIPPED=0
pass() { PASSED=$((PASSED + 1)); printf '%sPASS%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { FAILED=$((FAILED + 1)); printf '%sFAIL%s %s  (%s)\n' "$RED" "$RESET" "$1" "$2"; }
skip() { SKIPPED=$((SKIPPED + 1)); printf '%sSKIP%s %s  (%s)\n' "$YELLOW" "$RESET" "$1" "$2"; }
note() { printf '%s     note: %s%s\n' "$YELLOW" "$1" "$RESET"; }
section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }

# req METHOD PATH [jar] [extra curl args...] -> sets STATUS, body in $BODY, headers in $HDRS
req() {
  local method="$1" path="$2" jar="${3:-}"
  shift 3 2>/dev/null || shift $#
  local args=(-s -o "$BODY" -D "$HDRS" -w '%{http_code}' -X "$method")
  [ -n "$jar" ] && args+=(-b "$jar" -c "$jar")
  STATUS="$(curl "${args[@]}" "$@" "$API/$path")" || STATUS=000
}
jqb() { jq -r "$1" "$BODY" 2>/dev/null; }
header() { grep -i "^$1:" "$HDRS" | tail -1 | cut -d: -f2- | tr -d '\r' | sed 's/^ //'; }

json_post() { # path jar json [extra curl args]
  local path="$1" jar="$2" data="$3"
  shift 3
  req POST "$path" "$jar" -H 'Content-Type: application/json' -d "$data" "$@"
}

rand() { LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8; }

signup() { # jar name -> creates user, leaves session in jar
  local jar="$1" name="$2"
  EMAIL="$name@example.test"; PASSWORD="Pw-$(rand)-Aa1!"
  json_post auth/signUp "$jar" "$(jq -n --arg u "$name" --arg e "$EMAIL" --arg p "$PASSWORD" \
    '{username:$u,email:$e,password:$p}')"
  [ "$STATUS" = 201 ] || [ "$STATUS" = 200 ] || { echo "signup failed for $name: $STATUS $(cat "$BODY")"; exit 98; }
}
login() { # jar email password
  json_post auth/signIn "$1" "$(jq -n --arg e "$2" --arg p "$3" '{email:$e,password:$p}')"
}

create_share() { # jar expiration security-json [size] -> sets SHARE_ID (empty on failure); STATUS/BODY remain
  local jar="$1" exp="$2" sec="$3" size="${4:-}"
  local payload
  payload="$(jq -n --arg e "$exp" --argjson s "$sec" --arg size "$size" \
    '{expiration:$e,recipients:[],security:$s} + (if $size == "" then {} else {size:($size|tonumber)} end)')"
  json_post shares "$jar" "$payload"
  # Old builds required a client-chosen id; retry with one so the demo still runs there.
  if [ "$STATUS" = 400 ] && grep -q '"property": *"id"' "$BODY"; then
    json_post shares "$jar" "$(echo "$payload" | jq --arg id "demo$(rand)$(rand)" '. + {id:$id}')"
  fi
  SHARE_ID=""
  [ "$STATUS" = 201 ] && SHARE_ID="$(jqb .id)"
}

upload_file() { # jar shareId name path -> single-chunk upload; STATUS/BODY remain; FILE_ID set
  local jar="$1" sid="$2" name="$3" path="$4"
  req POST "shares/$sid/files?name=$(jq -rn --arg n "$name" '$n|@uri')&chunkIndex=0&totalChunks=1" "$jar" \
    -H 'Content-Type: application/octet-stream' --data-binary "@$path"
  FILE_ID=""
  [ "$STATUS" = 201 ] && FILE_ID="$(jqb .id)"
}

complete_share() { json_post "shares/$2/complete" "$1" '{}'; }

get_token() { # jar shareId [password] [extra curl args]
  local jar="$1" sid="$2" pw="${3:-}"
  shift 3 2>/dev/null || shift $#
  if [ -n "$pw" ]; then
    json_post "shares/$sid/token" "$jar" "$(jq -n --arg p "$pw" '{password:$p}')" "$@"
  else
    json_post "shares/$sid/token" "$jar" '{}' "$@"
  fi
}

download() { # jar shareId fileId [extra curl args] ; use fileId "zip" for the archive
  local jar="$1" sid="$2" fid="$3"
  shift 3
  req GET "shares/$sid/files/$fid?download=false" "$jar" "$@"
}

# expect STATUS and error code in last response
expect_error() { # label status error [message]
  local label="$1" want_status="$2" want_err="$3" want_msg="${4:-}"
  local err msg
  err="$(jqb .error)"; msg="$(jqb .message)"
  if [ "$STATUS" = "$want_status" ] && [ "$err" = "$want_err" ] && { [ -z "$want_msg" ] || [ "$msg" = "$want_msg" ]; }; then
    pass "$label"
  else
    fail "$label" "got $STATUS error=$err message=$msg; want $want_status $want_err ${want_msg}"
  fi
}

# --- fixtures ---------------------------------------------------------------
head -c 11000000 /dev/zero | tr '\0' 'A' >"$TMP/big.txt"
printf 'hello from the attack demo\n' >"$TMP/note.txt"
printf '<html><body><script>alert(document.cookie)</script></body></html>\n' >"$TMP/evil.html"
printf 'MZ not really an exe\n' >"$TMP/a.pdf.exe"

printf '%sRV Files attack demo%s  target: %s  FAST=%s\n' "$BOLD" "$RESET" "$API" "$FAST"
SUF="$(rand)"
signup "$JAR_A" "owner$SUF"; A_EMAIL="$EMAIL"; A_PASS="$PASSWORD"
signup "$JAR_B" "attacker$SUF"
echo "signed up owner$SUF (A) and attacker$SUF (B)"

# A fresh share for A with one safe file; sets S_ID and S_FILE
new_live_share() {
  create_share "$JAR_A" "1-day" '{}'
  S_ID="$SHARE_ID"; S_FILE=""
  [ -n "$S_ID" ] || { echo "cannot create share: $STATUS $(cat "$BODY")"; return 1; }
  upload_file "$JAR_A" "$S_ID" note.txt "$TMP/note.txt"
  S_FILE="$FILE_ID"
  complete_share "$JAR_A" "$S_ID"
}

# --- 1-3 file safety --------------------------------------------------------
section "File safety"
create_share "$JAR_A" "1-day" '{}'; SID="$SHARE_ID"
upload_file "$JAR_A" "$SID" evil.html "$TMP/evil.html"
if [ "$STATUS" = 400 ] && jqb .message | grep -qi "not allowed"; then pass "1. evil.html blocked (400, not allowed)"
else fail "1. evil.html blocked" "got $STATUS $(jqb .message)"; fi

upload_file "$JAR_A" "$SID" a.pdf.exe "$TMP/a.pdf.exe"
if [ "$STATUS" = 400 ] && jqb .message | grep -qi "not allowed"; then pass "2. a.pdf.exe blocked (400, not allowed)"
else fail "2. a.pdf.exe blocked" "got $STATUS $(jqb .message)"; fi

upload_file "$JAR_A" "$SID" big.txt "$TMP/big.txt"
if [ "$STATUS" = 400 ] || [ "$STATUS" = 413 ]; then pass "3. 11 MB file rejected ($STATUS)"
else fail "3. 11 MB file rejected" "got $STATUS $(jqb .message)"; fi

# --- 4 quota ----------------------------------------------------------------
section "Storage quota"
create_share "$JAR_A" "1-day" '{}' 60000000
if [ "$STATUS" = 400 ] && jqb .message | grep -qi "quota"; then pass "4. 60 MB declared share rejected (quota)"
else fail "4. quota exceeded rejected" "got $STATUS $(jqb .message)"; fi

# --- 5-6 error shape and headers ---------------------------------------------
section "Error shape and download headers"
req GET "shares/abc" ""
expect_error "5. unknown share -> share_not_found" 404 share_not_found

if new_live_share; then
  get_token "$TMP/dl.jar" "$S_ID"
  download "$TMP/dl.jar" "$S_ID" "$S_FILE"
  nosniff="$(header x-content-type-options)"; csp="$(header content-security-policy)"
  if [ "$STATUS" = 200 ] && [ "$(echo "$nosniff" | tr A-Z a-z)" = nosniff ] && echo "$csp" | grep -q sandbox; then
    pass "6. .txt download has nosniff + CSP sandbox"
  else fail "6. download headers" "status=$STATUS nosniff='$nosniff' csp='$csp'"; fi
else fail "6. download headers" "setup failed"; fi

# --- 7 revoke ---------------------------------------------------------------
section "Revoke"
if new_live_share; then
  json_post "shares/$S_ID/revoke" "$JAR_A" '{}'
  rev_status="$STATUS"
  ok=1; detail="revoke=$rev_status"
  for p in "shares/$S_ID" "shares/$S_ID/files/$S_FILE" "shares/$S_ID/files/zip"; do
    req GET "$p" ""
    if ! { [ "$STATUS" = 404 ] && [ "$(jqb .error)" = share_removed ] && [ "$(jqb .message)" = "Revoked by owner" ]; }; then
      ok=0; detail="$detail; $p -> $STATUS $(jqb .error)/$(jqb .message)"
    fi
  done
  if [ "$ok" = 1 ] && [ "$rev_status" = 200 ]; then pass "7. revoked share: share/file/zip all 404 share_removed 'Revoked by owner'"
  else fail "7. revoke" "$detail"; fi
else fail "7. revoke" "setup failed"; fi

# --- 8 expiry ---------------------------------------------------------------
section "Expiry"
if [ "$FAST" = 1 ]; then
  skip "8. expired share -> share_expired" "FAST=1"
else
  create_share "$JAR_A" "1-minute" '{}'
  if [ -z "$SHARE_ID" ]; then fail "8. expired share" "1-minute rejected: $STATUS $(jqb .message)"
  else
    upload_file "$JAR_A" "$SHARE_ID" note.txt "$TMP/note.txt"; complete_share "$JAR_A" "$SHARE_ID"
    echo "waiting 65 s for expiry (FAST=1 skips)..."; sleep 65
    req GET "shares/$SHARE_ID" ""
    expect_error "8. expired share -> share_expired" 404 share_expired
  fi
fi

# --- 9 cross-user -----------------------------------------------------------
section "Cross-user attacks (B against A's share)"
if new_live_share; then
  ok=1; detail=""
  json_post "shares/$S_ID/revoke" "$JAR_B" '{}'
  case "$STATUS" in 403|404) ;; *) ok=0; detail="revoke=$STATUS";; esac
  req DELETE "shares/$S_ID" "$JAR_B"
  case "$STATUS" in 403|404) ;; *) ok=0; detail="$detail delete=$STATUS";; esac
  req GET "shares/$S_ID/activity" "$JAR_B"
  case "$STATUS" in 403|404) ;; *) ok=0; detail="$detail activity=$STATUS";; esac
  get_token "$TMP/dl2.jar" "$S_ID"; download "$TMP/dl2.jar" "$S_ID" "$S_FILE"
  [ "$STATUS" = 200 ] || { ok=0; detail="$detail still-downloadable=$STATUS"; }
  if [ "$ok" = 1 ]; then pass "9. B cannot revoke/delete/read activity; A's share still downloads"
  else fail "9. cross-user" "$detail"; fi
else fail "9. cross-user" "setup failed"; fi

# --- 10 password tripwire ----------------------------------------------------
section "Password brute-force tripwire"
create_share "$JAR_A" "1-day" '{"password":"correct-horse-9"}'
PSID="$SHARE_ID"
if [ -n "$PSID" ]; then
  upload_file "$JAR_A" "$PSID" note.txt "$TMP/note.txt"; complete_share "$JAR_A" "$PSID"
  for i in 1 2 3 4 5; do get_token "" "$PSID" "wrong-$i"; done
  get_token "" "$PSID" "wrong-6"
  expect_error "10. 5 wrong passwords -> auto-revoked" 404 share_removed "Auto-revoked: too many wrong passwords"
else fail "10. password tripwire" "could not create share: $STATUS $(jqb .message)"; fi

# --- 11 download tripwire ----------------------------------------------------
section "Download-spray tripwire"
note "needs TRUST_PROXY=true on the API so X-Forwarded-For is honoured (set in docker-compose.local.yml)"
if new_live_share; then
  get_token "$TMP/dl3.jar" "$S_ID"
  for i in $(seq 1 20); do
    ip="203.0.113.$(( (i % 5) + 1 ))"
    download "$TMP/dl3.jar" "$S_ID" "$S_FILE" -H "X-Forwarded-For: $ip"
  done
  req GET "shares/$S_ID" ""
  expect_error "11. 20 downloads from 5 IPs -> auto-revoked" 404 share_removed "Auto-revoked: unusual download activity"
else fail "11. download tripwire" "setup failed"; fi

# --- 12 login throttling -----------------------------------------------------
section "Login rate limit"
got429=0
for i in $(seq 1 30); do
  login "" "$A_EMAIL" "definitely-wrong-$i"
  [ "$STATUS" = 429 ] && { got429=$((got429 + 1)); }
done
if [ "$got429" -ge 1 ]; then pass "12. 30 bad sign-ins -> $got429 x 429"
else fail "12. sign-in throttling" "no 429 seen"; fi

# --- summary -----------------------------------------------------------------
printf '\n%sSummary:%s %s%d passed%s, %s%d failed%s, %d skipped\n' "$BOLD" "$RESET" \
  "$GREEN" "$PASSED" "$RESET" "$RED" "$FAILED" "$RESET" "$SKIPPED"
exit "$FAILED"
