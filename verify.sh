#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verify.sh - one command to check the whole application.
#
#   ./verify.sh
#
# It runs the backend test suite, then (if the servers are running) checks the
# live API, the frontend build, and the dev server. Exits non-zero on failure.
# ---------------------------------------------------------------------------
set -uo pipefail

API="${API:-http://127.0.0.1:5000}"
WEB="${WEB:-http://127.0.0.1:5173}"
BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"

PY="$BACKEND_DIR/venv/bin/python"
[ -x "$PY" ] || PY="python3"

pass=0
fail=0

check() { # check <description> <expected> <actual>
  if [ "$2" = "$3" ]; then
    printf '  PASS  %-52s %s\n' "$1" "$3"
    pass=$((pass + 1))
  else
    printf '  FAIL  %-52s expected %s, got %s\n' "$1" "$2" "$3"
    fail=$((fail + 1))
  fi
}

code() { # code <method> <url> [json-body]
  if [ -n "${3:-}" ]; then
    curl -s -o /dev/null -w '%{http_code}' -X "$1" "$2" \
      -H 'Content-Type: application/json' -d "$3"
  else
    curl -s -o /dev/null -w '%{http_code}' -X "$1" "$2"
  fi
}

echo '=============================================='
echo ' 1. Backend test suite (pytest)'
echo '=============================================='
if (cd "$BACKEND_DIR" && "$PY" -m pytest -q 2>&1 | tail -2); then
  pass=$((pass + 1))
else
  fail=$((fail + 1))
fi

echo
echo '=============================================='
echo ' 2. Live API'
echo '=============================================='
if curl -s -o /dev/null --max-time 3 "$API/api/health"; then
  check 'GET /api/health' 200 "$(code GET "$API/api/health")"
  check 'GET /api/students' 200 "$(code GET "$API/api/students")"
  check 'GET /api/students?search=x' 200 "$(code GET "$API/api/students?search=x")"
  check 'GET /api/students?sort=age&order=asc' 200 "$(code GET "$API/api/students?sort=age&order=asc")"
  check 'GET /api/students?sort=bogus (rejected)' 400 "$(code GET "$API/api/students?sort=bogus")"
  check 'GET /api/students/999999 (missing)' 404 "$(code GET "$API/api/students/999999")"
  check 'DELETE /api/students/999999 (missing)' 404 "$(code DELETE "$API/api/students/999999")"
  check 'PUT /api/students/999999 (missing)' 404 \
    "$(code PUT "$API/api/students/999999" '{"student_id":"X","full_name":"X","age":20,"email":"x@y.com","course":"X"}')"
  check 'POST invalid body (rejected)' 400 "$(code POST "$API/api/students" '{"student_id":""}')"

  # Round-trip a throwaway record, then clean it up.
  STAMP="VERIFY-$RANDOM"
  created_ok=$(curl -s -X POST "$API/api/students" -H 'Content-Type: application/json' \
    -d "{\"student_id\":\"$STAMP\",\"full_name\":\"Verify Run\",\"age\":20,\"email\":\"$STAMP@example.com\",\"course\":\"QA\"}" \
    | "$PY" -c 'import sys,json; d=json.load(sys.stdin); print(d.get("id","none"))')
  if [ "$created_ok" != "none" ]; then
    check 'POST valid record (created)' 201 201
    check 'duplicate rejected' 409 \
      "$(code POST "$API/api/students" "{\"student_id\":\"$STAMP\",\"full_name\":\"Dup\",\"age\":20,\"email\":\"dup@example.com\",\"course\":\"QA\"}")"
    check 'DELETE the throwaway record' 200 "$(code DELETE "$API/api/students/$created_ok")"
  else
    check 'POST valid record (created)' 201 "$created_ok"
  fi
else
  echo '  SKIP  API not reachable - start it with: cd backend && python app.py'
fi

echo
echo '=============================================='
echo ' 3. Frontend'
echo '=============================================='
if (cd "$FRONTEND_DIR" && npm run build >/dev/null 2>&1); then
  check 'production build' ok ok
else
  check 'production build' ok failed
fi
rm -rf "$FRONTEND_DIR/dist"

if curl -s -o /dev/null --max-time 3 "$WEB/"; then
  check 'GET / (dev server)' 200 "$(code GET "$WEB/")"
  check 'GET /api/health via Vite proxy' 200 "$(code GET "$WEB/api/health")"
else
  echo '  SKIP  dev server not reachable - start it with: cd frontend && npm run dev'
fi

echo
echo '=============================================='
printf ' RESULT: %d passed, %d failed\n' "$pass" "$fail"
echo '=============================================='
[ "$fail" -eq 0 ] || exit 1
