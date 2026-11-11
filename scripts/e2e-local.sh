#!/usr/bin/env bash
# Full-stack E2E for the Workers API: the real Worker runtime (`wrangler dev`, local mode) with a local D1.
# It never talks to Cloudflare or to production. Exit 0 only when every case passes.
#   bash scripts/e2e-local.sh        (needs `npm ci --legacy-peer-deps` in services/api)
# `note` lines are policy observations that need a human decision; they do not fail the run.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="${ROOT_DIR}/services/api"
WRANGLER="${API_DIR}/node_modules/.bin/wrangler"
free_port() { node -e 'const s = require("net").createServer().listen(0, "127.0.0.1", () => { process.stdout.write(String(s.address().port)); s.close(); });'; }
PORT="${E2E_PORT:-$(free_port)}"
INSPECTOR_PORT="${E2E_INSPECTOR_PORT:-$(free_port)}"
BASE="http://127.0.0.1:${PORT}"
STATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cios-e2e.XXXXXX")"

rand() { node -e 'process.stdout.write(require("crypto").randomBytes(12).toString("hex"))'; }
JWT_SECRET="e2e-jwt-$(rand)"
FLOW_WEBHOOK_SECRET="e2e-flow-$(rand)"
E2E_SHA="e2e$(rand)"
export JWT_SECRET FLOW_WEBHOOK_SECRET

PASS=0
FAIL=0
FAILED=()
WORKER_PID=""
RES_CODE=""
RES_BODY=""
RES_HEAD=""

start_worker() {
  (
    cd "${API_DIR}" || exit 1
    export WRANGLER_SEND_METRICS=false
    exec "${WRANGLER}" dev --local --ip 127.0.0.1 --port "${PORT}" --inspector-port "${INSPECTOR_PORT}" \
      --persist-to "${STATE_DIR}/state" \
      --var "JWT_SECRET:${JWT_SECRET}" --var "FLOW_WEBHOOK_SECRET:${FLOW_WEBHOOK_SECRET}" \
      --var "GIT_SHA:${E2E_SHA}" --var "ALLOW_DEMO_SEED:false" >> "${STATE_DIR}/worker.log" 2>&1
  ) &
  WORKER_PID=$!
  local i
  for i in $(seq 1 90); do
    if curl -fsS -m 2 -o /dev/null "${BASE}/health" 2>/dev/null; then return 0; fi
    kill -0 "${WORKER_PID}" 2>/dev/null || break
    sleep 1
  done
  echo "worker failed to start; log tail:" >&2
  tail -n 20 "${STATE_DIR}/worker.log" >&2
  return 1
}

kill_tree() {
  local pid="$1" sig="$2" child
  for child in $(pgrep -P "${pid}" 2>/dev/null); do kill_tree "${child}" "${sig}"; done
  kill "-${sig}" "${pid}" 2>/dev/null
}

stop_worker() {
  if [ -n "${WORKER_PID}" ]; then
    # wrangler wraps a node child that owns workerd: stop the whole tree, then escalate.
    kill_tree "${WORKER_PID}" TERM
    local i
    for i in 1 2 3 4 5; do kill -0 "${WORKER_PID}" 2>/dev/null || break; sleep 1; done
    kill_tree "${WORKER_PID}" KILL
    { wait "${WORKER_PID}"; } 2>/dev/null
  fi
  local p
  # workerd outlives wrangler, so free both the HTTP and the inspector port.
  for p in $(lsof -t -i "tcp:${PORT}" -i "tcp:${INSPECTOR_PORT}" 2>/dev/null); do kill "${p}" 2>/dev/null; done
  sleep 1
  WORKER_PID=""
}

trap 'stop_worker; rm -rf "${STATE_DIR}"' EXIT

ok() { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad() {
  FAIL=$((FAIL + 1))
  FAILED+=("$1")
  printf '  FAIL %s\n' "$1"
  [ -n "${2:-}" ] && printf '       %s\n' "$2"
}
note() { printf '  note %s\n' "$1"; }
section() { printf '\n== %s\n' "$1"; }

# req METHOD PATH [BODY] [TOKEN] [extra curl args...]
req() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  shift $(( $# < 4 ? $# : 4 ))
  local args=(-sS -m 30 -X "${method}" -D "${STATE_DIR}/h.txt" -o "${STATE_DIR}/b.json" -w '%{http_code}')
  [ -n "${token}" ] && args+=(-H "Authorization: Bearer ${token}")
  [ -n "${body}" ] && args+=(-H "Content-Type: application/json" --data-binary "${body}")
  RES_CODE="$(curl "${args[@]}" "$@" "${BASE}${path}" 2>/dev/null)"
  RES_BODY="$(cat "${STATE_DIR}/b.json" 2>/dev/null)"
  RES_HEAD="$(tr -d '\r' < "${STATE_DIR}/h.txt" 2>/dev/null)"
}

hdr() {
  printf '%s\n' "${RES_HEAD}" | awk -F': ' -v k="$(printf '%s' "$1" | tr 'A-Z' 'a-z')" 'tolower($1) == k { print $2 }' | head -n 1
}

# jval 'JS expression over b' -> value of the expression evaluated on the parsed response body
jval() {
  printf '%s' "${RES_BODY}" | node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try {
        const v = new Function("b", "return (" + process.argv[1] + ")")(JSON.parse(s));
        process.stdout.write(v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
      } catch (e) {}
    });' "$1"
}

expect_code() { if [ "${RES_CODE}" = "$2" ]; then ok "$1"; else bad "$1" "HTTP ${RES_CODE}, expected $2: $(printf '%s' "${RES_BODY}" | cut -c1-140)"; fi; }
expect_code_in() {
  case " $2 " in
    *" ${RES_CODE} "*) ok "$1" ;;
    *) bad "$1" "HTTP ${RES_CODE}, expected one of: $2: $(printf '%s' "${RES_BODY}" | cut -c1-140)" ;;
  esac
}
expect_json() { local got; got="$(jval "$2")"; if [ "${got}" = "$3" ]; then ok "$1"; else bad "$1" "got '${got}', expected '$3'"; fi; }
expect_clean_error() {
  if printf '%s' "${RES_BODY}" | grep -qE '\.(ts|js):[0-9]+|node_modules|[[:space:]]at [A-Za-z_.<>]+ \('; then
    bad "$1 leaks internals" "$(printf '%s' "${RES_BODY}" | cut -c1-160)"
  elif [ -z "$(jval 'b.trace_id')" ] || [ -z "$(jval 'b.error && b.error.code')" ]; then
    bad "$1 has an error envelope (trace_id + error.code)" "$(printf '%s' "${RES_BODY}" | cut -c1-160)"
  else
    ok "$1 returns a clean error envelope"
  fi
}

# mint ROLE [TTL_SECONDS] [SIGNING: hs256|none|wrongkey] [SUBJECT_SUFFIX]
mint() {
  node -e '
    const crypto = require("crypto");
    const [role, ttl, mode, suffix] = process.argv.slice(1);
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const h = b64({ alg: mode === "none" ? "none" : "HS256", typ: "JWT" });
    const p = b64({ sub: "e2e-" + role + (suffix ? "-" + suffix : ""), role, jti: crypto.randomUUID(), iss: "cios.iai.one", aud: "cios-workers-api", iat: now, nbf: now - 5, exp: now + Number(ttl || 3600) });
    const key = mode === "wrongkey" ? "not-the-real-secret" : process.env.JWT_SECRET;
    const sig = mode === "none" ? "" : crypto.createHmac("sha256", key).update(h + "." + p).digest("base64url");
    process.stdout.write(h + "." + p + "." + sig);' "$@"
}

[ -x "${WRANGLER}" ] || { echo "wrangler not installed: run 'npm ci --legacy-peer-deps' in services/api" >&2; exit 2; }
echo "CIOS local E2E: starting the Worker on ${BASE} (local D1 in ${STATE_DIR}/state)"
start_worker || exit 2

section "platform"
req GET /health "" ""; expect_code "GET /health" 200
req GET /v1/meta "" ""; expect_code "GET /v1/meta" 200
expect_json "meta.release.commit reports the GIT_SHA var" 'b.data.release.commit' "${E2E_SHA}"
req GET /v1/system/health "" ""; expect_json "system health is healthy" 'b.data.status' healthy
req GET /v1/__unknown_route "" ""; expect_code "unknown route is 404" 404; expect_clean_error "unknown route"

section "auth lifecycle"
EMAIL="e2e_$(rand | cut -c1-8)@example.com"
req POST /v1/auth/register "{\"email\":\"${EMAIL}\",\"password\":\"password123\",\"role\":\"root\",\"workspaceCode\":\"victim\",\"displayName\":\"E2E\"}" ""
expect_code "register" 200
expect_json "client-supplied role is ignored (server assigns sales_rep)" 'b.data.member.role' sales_rep
expect_json "client-supplied workspace is ignored" 'b.data.member.workspaceCode' demo
req POST /v1/auth/register "{\"email\":\"${EMAIL}\",\"password\":\"password123\"}" ""
expect_code_in "duplicate registration is rejected" "400 409 422"; expect_clean_error "duplicate registration"
req POST /v1/auth/register "{\"email\":\"short_$(rand | cut -c1-6)@example.com\",\"password\":\"abc\"}" ""
expect_code "weak password is rejected" 400
req POST /v1/auth/session "{\"email\":\"${EMAIL}\",\"password\":\"wrong-password\"}" ""
expect_code "wrong password" 401; expect_clean_error "wrong password"
WRONG_BODY="${RES_BODY}"
req POST /v1/auth/session "{\"email\":\"nobody_$(rand | cut -c1-6)@example.com\",\"password\":\"password123\"}" ""
expect_code "unknown account" 401
if [ "$(printf '%s' "${RES_BODY}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).error.message)}catch(e){}})')" = "$(printf '%s' "${WRONG_BODY}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).error.message)}catch(e){}})')" ]; then
  ok "unknown account and wrong password give the same message (no user enumeration)"
else
  bad "unknown account and wrong password give the same message (no user enumeration)"
fi
req POST /v1/auth/session "{}" ""; expect_code "empty login body" 400
req POST /v1/auth/session "{not json" "" -H "Content-Type: application/json"; expect_code_in "malformed JSON" "400 415 422"
req POST /v1/auth/session "{\"email\":\"${EMAIL}\",\"password\":\"password123\"}" ""
expect_code "login" 200
TOKEN="$(jval 'b.data.token')"
[ -n "${TOKEN}" ] && ok "login returns a token" || bad "login returns a token"
req GET /v1/auth/me "" "${TOKEN}"; expect_code "GET /v1/auth/me" 200
req GET /v1/auth/me "" "${TOKEN%?}x"; expect_code "tampered token" 401
req GET /v1/auth/me "" "$(mint operator 3600 none)"; expect_code "unsigned token (alg=none)" 401
req GET /v1/auth/me "" "$(mint operator 3600 wrongkey)"; expect_code "token signed with another key" 401
req GET /v1/auth/me "" "$(mint operator -60)"; expect_code "expired token" 401
req GET /v1/auth/me "" ""; expect_code "no token" 401
req GET /v1/auth/me "" "" -H "Authorization: Basic ${TOKEN}"; expect_code "wrong auth scheme" 401

section "authorization matrix"
for p in /v1/bootstrap /v1/overview /v1/crm/organizations /v1/discovery/sources /v1/discovery/crawl-governance /v1/review/queue /v1/compliance/audit /v1/reports/hourly /v1/events/search /v1/governance/audit /v1/flow/logs; do
  req GET "${p}" "" ""; expect_code "GET ${p} without token" 401
done
for p in /v1/bootstrap /v1/overview /v1/crm/organizations /v1/discovery/sources /v1/review/queue /v1/compliance/audit; do
  req GET "${p}" "" "${TOKEN}"; expect_code "GET ${p} with a registered user" 200
done
OPERATOR="$(mint operator)"; GOVERNOR="$(mint governor)"; OBSERVER="$(mint observer)"
req GET /v1/governance/audit "" "${TOKEN}"; expect_code "governance audit is not readable by a registered user" 403
req GET /v1/governance/audit "" "${GOVERNOR}"; expect_code "governance audit is readable by governor" 200
req GET /v1/flow/logs "" "${OPERATOR}"; expect_code "flow logs are not readable by operator" 403
req POST /v1/governance/approvals "{\"request_id\":\"r1\",\"decision\":\"approve\",\"reason\":\"e2e\"}" "${OPERATOR}"
expect_code "approvals are not allowed for operator" 403
req POST /v1/flow/dispatch "{}" "${OPERATOR}" -H "Idempotency-Key: e2e-$(rand)"; expect_code "flow dispatch is not allowed for operator" 403
req POST /v1/events/ingest "{}" "${OBSERVER}" -H "Idempotency-Key: e2e-$(rand)"; expect_code "event ingest is not allowed for observer" 403

section "events, idempotency and flow"
KEY="e2e-ingest-$(rand)"
INGEST='{"source":"e2e-suite","event_type":"system.e2e","occurred_at":"2026-04-03T00:00:00.000Z","payload":{"message":"e2e"},"entity_refs":["org_demo"]}'
req POST /v1/events/ingest "${INGEST}" "${OPERATOR}"; expect_code "ingest without Idempotency-Key" 400
req POST /v1/events/ingest "${INGEST}" "${OPERATOR}" -H "Idempotency-Key: ${KEY}"; expect_code "ingest" 200
FIRST_ID="$(jval 'b.data.event_id || b.data.id')"
req POST /v1/events/ingest "${INGEST}" "${OPERATOR}" -H "Idempotency-Key: ${KEY}"
expect_code_in "replaying the same key and payload does not fail" "200 202 409"
req POST /v1/events/ingest '{"source":"e2e-suite","event_type":"system.other","occurred_at":"2026-04-03T00:00:00.000Z","payload":{"message":"changed"},"entity_refs":["org_demo"]}' "${OPERATOR}" -H "Idempotency-Key: ${KEY}"
expect_code_in "same key with a different payload is rejected" "409 422"
req GET "/v1/events/search?q=e2e-suite" "" "${OBSERVER}"; expect_code "events search" 200
SEARCH_HITS="$(jval 'JSON.stringify(b.data).includes("e2e-suite")')"
[ "${SEARCH_HITS}" = "true" ] && ok "the ingested event is searchable" || bad "the ingested event is searchable"
req POST /v1/events/ingest "{\"source\":\"e2e\"}" "${OPERATOR}" -H "Idempotency-Key: e2e-$(rand)"; expect_code "ingest with missing fields" 400

FLOW_KEY="e2e-flow-$(rand)"
req POST /v1/flow/dispatch '{"trigger_name":"e2e.flow","source_decision_id":"dec_e2e_001","priority":"high","expected_callback":"flow.callback","requested_by":"e2e-user","approved_by":"e2e-approver","payload":{"reason":"e2e"}}' "${GOVERNOR}" -H "Idempotency-Key: ${FLOW_KEY}"
expect_code "flow dispatch" 200
RUN_ID="$(jval 'b.data.flow_dispatch_id')"
[ -n "${RUN_ID}" ] && ok "flow dispatch returns an id" || bad "flow dispatch returns an id"
CB="{\"flow_run_id\":\"${RUN_ID}\",\"trigger_name\":\"e2e.flow\",\"status\":\"success\",\"completed_at\":\"2026-04-03T00:30:00.000Z\",\"trace_id\":\"trace_e2e_001\",\"result\":{\"message\":\"done\"}}"
SIG="$(printf '%s' "${CB}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(require("crypto").createHmac("sha256",process.env.FLOW_WEBHOOK_SECRET).update(s).digest("hex")))')"
req POST /v1/flow/callback "${CB}" "${GOVERNOR}"; expect_code "flow callback without signature" 401
req POST /v1/flow/callback "${CB}" "${GOVERNOR}" -H "x-flow-signature: deadbeef"; expect_code "flow callback with a wrong signature" 401
req POST /v1/flow/callback "${CB}" "${GOVERNOR}" -H "x-flow-signature: ${SIG}"; expect_code "flow callback with a valid signature" 200
req GET /v1/flow/logs "" "${GOVERNOR}"; expect_code "flow logs" 200
[ "$(jval "b.data.filter(x => x.flow_run_id === '${RUN_ID}').map(x => x.status).sort().join(',')")" = "accepted,success" ] \
  && ok "flow logs hold accepted + success for the run" || bad "flow logs hold accepted + success for the run" "$(jval "b.data.filter(x => x.flow_run_id === '${RUN_ID}')")"

section "stubbed endpoints and audit lineage"
req POST /v1/simulations/run '{"scenario_name":"e2e","base_state_ref":"state_1","input_parameters":{"a":1},"time_horizon":"7d"}' "${OPERATOR}"
expect_code "simulation run" 200
expect_json "simulation run is flagged as stubbed" 'b.meta.status' stubbed
req POST /v1/governance/approvals '{"request_id":"req_e2e","decision":"approve","reason":"e2e"}' "${GOVERNOR}"
expect_code "governance approval" 200
expect_json "governance approval is flagged as stubbed" 'b.meta.status' stubbed
req GET /v1/governance/audit "" "${GOVERNOR}"
[ "$(jval "(() => { const r = b.data.filter(x => x.action === 'simulation_run'); return r.length > 0 && r.every(x => x.details && x.details.stubbed === true); })()")" = "true" ] \
  && ok "audit rows of the stubbed simulation run say stubbed" || bad "audit rows of the stubbed simulation run say stubbed"
[ "$(jval "(() => { const r = b.data.filter(x => x.action === 'governance_approval' && x.result === 'success'); return r.length > 0 && r.every(x => x.details && x.details.stubbed === true); })()")" = "true" ] \
  && ok "audit rows of the stubbed governance approval say stubbed" || bad "audit rows of the stubbed governance approval say stubbed"
req POST /v1/data/query '{"dimensions":["event_type"],"metrics":["count"],"time_slice":"day","limit":10}' "${OPERATOR}"
expect_code "data query" 200
expect_json "data query is served from the local D1" 'b.meta.source' d1-query

section "abuse resistance"
node -e 'process.stdout.write(JSON.stringify({email:"big@example.com",password:"x".repeat(2*1024*1024)}))' > "${STATE_DIR}/big.json"
req POST /v1/auth/session "" "" -H "Content-Type: application/json" --data-binary "@${STATE_DIR}/big.json"
expect_code "a 2 MB login body is refused with 413" 413
node -e 'process.stdout.write(JSON.stringify({source:"e2e",event_type:"system.big",occurred_at:"2026-04-03T00:00:00.000Z",payload:{blob:"x".repeat(300*1024)},entity_refs:[]}))' > "${STATE_DIR}/big-ingest.json"
req POST /v1/events/ingest "" "$(mint operator)" -H "Content-Type: application/json" -H "Idempotency-Key: e2e-big-$(rand)" --data-binary "@${STATE_DIR}/big-ingest.json"
expect_code "a 300 KB event payload is refused with 413" 413
req POST /v1/auth/session "{\"email\":\"a' OR '1'='1\",\"password\":\"x' OR '1'='1\"}" ""
expect_code_in "SQL-looking credentials do not cause a server error" "400 401"
RATE_TOKEN="$(mint operator 3600 hs256 ratetest)"
HITS_429=0
for i in $(seq 1 26); do
  req POST /v1/simulations/run '{"scenario_name":"rate","base_state_ref":"s","input_parameters":{},"time_horizon":"1d"}' "${RATE_TOKEN}"
  [ "${RES_CODE}" = "429" ] && HITS_429=$((HITS_429 + 1))
done
[ "${HITS_429}" -ge 1 ] && ok "simulation runs are rate limited (${HITS_429} x 429 in 26 calls)" || bad "simulation runs are rate limited" "no 429 in 26 calls"
REG_429=0
for i in $(seq 1 14); do
  req POST /v1/auth/register "{\"email\":\"burst_$(rand | cut -c1-10)@example.com\",\"password\":\"password123\"}" ""
  [ "${RES_CODE}" = "429" ] && REG_429=$((REG_429 + 1))
done
note "open registration: ${REG_429} x 429 in 14 rapid registrations from one client"
req POST /v1/events/ingest "${INGEST}" "${TOKEN}" -H "Idempotency-Key: e2e-open-$(rand)"
note "a self-registered account can POST /v1/events/ingest: HTTP ${RES_CODE} (200 means open registration grants write access to the shared demo workspace)"

section "CORS"
cors_origin() { req OPTIONS /v1/meta "" "" -H "Origin: $1" -H "Access-Control-Request-Method: GET"; hdr access-control-allow-origin; }
for o in https://cios.iai.one https://www.cios.iai.one https://cios-iai-one-3ai.pages.dev https://56a11a09.cios-iai-one-3ai.pages.dev http://localhost:3000; do
  [ "$(cors_origin "${o}")" = "${o}" ] && ok "CORS allows ${o}" || bad "CORS allows ${o}"
done
for o in https://cios-iai-one.pages.dev https://08e0d3ec.cios-iai-one.pages.dev https://evil.example null; do
  [ -z "$(cors_origin "${o}")" ] && ok "CORS rejects ${o}" || bad "CORS rejects ${o}" "reflected: $(hdr access-control-allow-origin)"
done
req OPTIONS /v1/meta "" "" -H "Origin: https://cios.iai.one" -H "Access-Control-Request-Method: GET"
[ -z "$(hdr access-control-allow-credentials)" ] && ok "CORS does not allow credentials" || bad "CORS does not allow credentials"

section "repo strict smoke against the local Worker"
WORKERS_API_URL="${BASE}" EXPECTED_COMMIT="${E2E_SHA}" bash "${ROOT_DIR}/scripts/smoke-workers-e2e.sh" --strict > "${STATE_DIR}/strict.out" 2> "${STATE_DIR}/strict.err"
SMOKE_RC=$?
[ "${SMOKE_RC}" = "0" ] && ok "smoke-workers-e2e.sh --strict exits 0" || bad "smoke-workers-e2e.sh --strict exits 0" "$(tail -n 2 "${STATE_DIR}/strict.err" | tr '\n' ' ')"

section "persistence across a Worker restart (D1, not memory)"
req POST /v1/auth/session "{\"email\":\"${EMAIL}\",\"password\":\"password123\"}" ""; TOKEN2="$(jval 'b.data.token')"
req POST /v1/auth/logout "{}" "${TOKEN2}"; expect_code "logout" 200
req GET /v1/auth/me "" "${TOKEN2}"; expect_code "token is revoked after logout" 401
req GET /v1/governance/audit "" "${GOVERNOR}"; AUDIT_BEFORE="$(jval 'b.data.length')"
req GET /v1/flow/logs "" "${GOVERNOR}"; FLOW_BEFORE="$(jval 'b.data.length')"
stop_worker
start_worker || { bad "worker restarts"; }
req GET /v1/auth/me "" "${TOKEN2}"; expect_code "a revoked token stays revoked after the restart" 401
req POST /v1/auth/session "{\"email\":\"${EMAIL}\",\"password\":\"password123\"}" ""; expect_code "the registered user can still log in after the restart" 200
req GET /v1/governance/audit "" "${GOVERNOR}"
[ "$(jval 'b.data.length')" -ge "${AUDIT_BEFORE:-0}" ] 2>/dev/null && ok "audit rows survive the restart (${AUDIT_BEFORE} before, $(jval 'b.data.length') after)" || bad "audit rows survive the restart" "before ${AUDIT_BEFORE}, after $(jval 'b.data.length')"
req GET /v1/flow/logs "" "${GOVERNOR}"
[ "$(jval 'b.data.length')" -ge "${FLOW_BEFORE:-0}" ] 2>/dev/null && ok "flow logs survive the restart (${FLOW_BEFORE} before, $(jval 'b.data.length') after)" || bad "flow logs survive the restart" "before ${FLOW_BEFORE}, after $(jval 'b.data.length')"
req GET /v1/meta "" ""; expect_json "meta still reports the GIT_SHA after the restart" 'b.data.release.commit' "${E2E_SHA}"

printf '\n== summary: %s passed, %s failed\n' "${PASS}" "${FAIL}"
if [ "${FAIL}" -gt 0 ]; then
  printf 'failed cases:\n'
  for c in "${FAILED[@]}"; do printf '  - %s\n' "${c}"; done
  exit 1
fi
exit 0
