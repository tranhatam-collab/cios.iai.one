#!/usr/bin/env bash
# Read-only smoke for the Cloudflare Pages frontend (production custom domain).
set -euo pipefail

SITE_URL="${PAGES_SITE_URL:-https://cios.iai.one}"
# Post-deploy: the commit site/version.json must report; empty skips the check.
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
VERSION_RETRIES="${SMOKE_VERSION_RETRIES:-10}"
VERSION_RETRY_DELAY="${SMOKE_VERSION_RETRY_DELAY:-3}"
REQUIRED_TEXT="Hệ điều hành trí tuệ khách hàng"
FORBIDDEN_TEXT="Day 7 Product Front"

fail() {
  printf 'PAGES_CHECK_FAILED: %s\n' "$1" >&2
  exit 1
}

if [ -n "$EXPECTED_COMMIT" ]; then
  attempt=1
  while :; do
    # Query string bypasses intermediate caches; transient timeouts are retried.
    VERSION_JSON="$(curl -sS --max-time 15 -H "Cache-Control: no-cache" \
      "${SITE_URL}/version.json?smoke=${EXPECTED_COMMIT}" || true)"
    LIVE_COMMIT="$(
      node -e '
        try {
          process.stdout.write(String(JSON.parse(process.argv[1] || "{}").commit ?? ""));
        } catch {}
      ' "$VERSION_JSON"
    )"
    if [ "$LIVE_COMMIT" = "$EXPECTED_COMMIT" ]; then
      break
    fi
    if [ "$attempt" -ge "$VERSION_RETRIES" ]; then
      fail "version.json commit \"${LIVE_COMMIT}\" != expected \"${EXPECTED_COMMIT}\""
    fi
    attempt=$((attempt + 1))
    sleep "$VERSION_RETRY_DELAY"
  done
fi

HOME_HTML="$(curl -fsS --max-time 20 --retry 5 --retry-delay 4 --retry-all-errors "${SITE_URL}/")"
grep -qF "$REQUIRED_TEXT" <<<"$HOME_HTML" || fail "homepage is missing \"${REQUIRED_TEXT}\""
# Absence check: `grep -qv` would pass as soon as any other line exists.
if grep -qF "$FORBIDDEN_TEXT" <<<"$HOME_HTML"; then
  fail "homepage still contains \"${FORBIDDEN_TEXT}\""
fi

NOT_FOUND_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${SITE_URL}/__smoke_missing_page")"
[ "$NOT_FOUND_STATUS" = "404" ] || fail "unknown page returned HTTP ${NOT_FOUND_STATUS} (expected 404)"

printf 'PAGES_SMOKE_OK: %s commit=%s\n' "$SITE_URL" "${EXPECTED_COMMIT:-unchecked}"
