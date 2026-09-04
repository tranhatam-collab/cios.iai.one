#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ "${CI:-}" != "true" ] && [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

node "${ROOT_DIR}/scripts/smoke-workers-preflight.mjs"
API_BASE_URL="${WORKERS_API_URL%/}"
# Bounded, no redirect following; fail on HTTP errors before parsing envelopes.
curl() { command curl --fail --connect-timeout 10 --max-time 30 "$@"; }
STRICT_MODE="false"

if [ "${1:-}" = "--strict" ]; then
  STRICT_MODE="true"
fi

if [ -z "${JWT_SECRET:-}" ]; then
  printf 'ERROR: JWT_SECRET is missing. Set it in .env or environment.\n' >&2
  exit 1
fi

TOKEN="$(
  node -e '
    const crypto = require("crypto");
    const secret = process.env.JWT_SECRET || "";
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      sub: "smoke-user",
      role: "governor",
      iss: "cios.iai.one",
      aud: "cios-workers-api",
      iat: now,
      nbf: now - 5,
      exp: now + 3600
    };
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
    const h = b64(header);
    const p = b64(payload);
    const sig = crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
    process.stdout.write(`${h}.${p}.${sig}`);
  '
)"

REQUEST_HEADERS=(
  -H "Authorization: Bearer ${TOKEN}"
  -H "Content-Type: application/json"
)

INGEST_KEY="smoke-ingest-$(date +%s)"
FLOW_KEY="smoke-flow-$(date +%s)"

HEALTH_RESPONSE="$(curl -sS "${API_BASE_URL}/v1/system/health" -H "Authorization: Bearer ${TOKEN}")"

INGEST_RESPONSE="$(
  curl -sS -X POST "${API_BASE_URL}/v1/events/ingest" \
    "${REQUEST_HEADERS[@]}" \
    -H "Idempotency-Key: ${INGEST_KEY}" \
    -d '{"source":"smoke-suite","event_type":"system.smoke","occurred_at":"2026-04-03T00:00:00.000Z","payload":{"message":"workers smoke warmup"},"entity_refs":["org_demo"]}'
)"

SEARCH_RESPONSE="$(curl -sS "${API_BASE_URL}/v1/events/search?q=smoke-suite" -H "Authorization: Bearer ${TOKEN}")"

DISPATCH_RESPONSE="$(
  curl -sS -X POST "${API_BASE_URL}/v1/flow/dispatch" \
    "${REQUEST_HEADERS[@]}" \
    -H "Idempotency-Key: ${FLOW_KEY}" \
    -d '{"trigger_name":"smoke.flow.callback","source_decision_id":"dec_smoke_bundle_001","priority":"high","expected_callback":"flow.callback","requested_by":"smoke-user","approved_by":"smoke-approver","payload":{"reason":"workers smoke flow"}}'
)"

FLOW_RUN_ID="$(
  node -e '
    const body = JSON.parse(process.argv[1] || "{}");
    process.stdout.write(body?.data?.flow_dispatch_id || "");
  ' "$DISPATCH_RESPONSE"
)"

if [ -z "$FLOW_RUN_ID" ]; then
  printf 'ERROR: Missing flow_dispatch_id in dispatch response.\n' >&2
  printf 'Dispatch response: %s\n' "$DISPATCH_RESPONSE" >&2
  exit 1
fi

CALLBACK_BODY="{\"flow_run_id\":\"${FLOW_RUN_ID}\",\"trigger_name\":\"smoke.flow.callback\",\"status\":\"success\",\"completed_at\":\"2026-04-03T00:30:00.000Z\",\"trace_id\":\"trace_smoke_bundle_001\",\"result\":{\"message\":\"callback completed\"}}"
CALLBACK_HEADERS=()
if [ -n "${FLOW_WEBHOOK_SECRET:-}" ]; then
  CALLBACK_SIGNATURE="$(printf '%s' "$CALLBACK_BODY" | node -e 'const c=require("node:crypto");let b="";process.stdin.on("data",d=>b+=d);process.stdin.on("end",()=>process.stdout.write(c.createHmac("sha256",process.env.FLOW_WEBHOOK_SECRET).update(b).digest("hex")))')"
  CALLBACK_HEADERS=(-H "x-flow-signature: ${CALLBACK_SIGNATURE}")
fi
CALLBACK_RESPONSE="$(
  curl -sS -X POST "${API_BASE_URL}/v1/flow/callback" \
    "${REQUEST_HEADERS[@]}" "${CALLBACK_HEADERS[@]}" \
    -d "$CALLBACK_BODY"
)"

FLOW_LOGS_RESPONSE="$(curl -sS "${API_BASE_URL}/v1/flow/logs" -H "Authorization: Bearer ${TOKEN}")"
AUDIT_RESPONSE="$(curl -sS "${API_BASE_URL}/v1/governance/audit" -H "Authorization: Bearer ${TOKEN}")"

if [ "$STRICT_MODE" = "true" ]; then
  node -e '
    const dispatch = JSON.parse(process.argv[1]);
    const callback = JSON.parse(process.argv[2]);
    const flowLogs = JSON.parse(process.argv[3]);
    const audit = JSON.parse(process.argv[4]);
    const flowRunId = process.argv[5];

    function fail(message) {
      console.error(`STRICT_CHECK_FAILED: ${message}`);
      process.exit(1);
    }

    if (!dispatch?.ok || !callback?.ok) {
      fail("dispatch/callback did not return ok=true");
    }

    const logs = Array.isArray(flowLogs?.data) ? flowLogs.data : [];
    const hasAccepted = logs.some((item) => item.flow_run_id === flowRunId && item.status === "accepted");
    const hasSuccess = logs.some((item) => item.flow_run_id === flowRunId && item.status === "success");
    if (!hasAccepted || !hasSuccess) {
      fail("missing new accepted/success events in flow_logs for current flow_run_id");
    }

    const dispatchTraceId = dispatch?.trace_id;
    const callbackTraceId = callback?.trace_id;
    const audits = Array.isArray(audit?.data) ? audit.data : [];
    const hasDispatchAudit = audits.some(
      (item) => item.action === "flow_dispatch" && item.result === "success" && item.traceId === dispatchTraceId,
    );
    const hasCallbackAudit = audits.some(
      (item) => item.action === "flow_callback" && item.result === "success" && item.traceId === callbackTraceId,
    );
    if (!hasDispatchAudit || !hasCallbackAudit) {
      fail("missing flow_dispatch/flow_callback success audit records for current traces");
    }
  ' "$DISPATCH_RESPONSE" "$CALLBACK_RESPONSE" "$FLOW_LOGS_RESPONSE" "$AUDIT_RESPONSE" "$FLOW_RUN_ID"
fi

node -e '
  const out = {
    health: JSON.parse(process.argv[1]),
    ingest: JSON.parse(process.argv[2]),
    search: JSON.parse(process.argv[3]),
    dispatch: JSON.parse(process.argv[4]),
    callback: JSON.parse(process.argv[5]),
    flow_logs: JSON.parse(process.argv[6]),
    governance_audit: JSON.parse(process.argv[7]),
    strict_mode: process.argv[8] === "true"
  };
  console.log(JSON.stringify(out, null, 2));
' "$HEALTH_RESPONSE" "$INGEST_RESPONSE" "$SEARCH_RESPONSE" "$DISPATCH_RESPONSE" "$CALLBACK_RESPONSE" "$FLOW_LOGS_RESPONSE" "$AUDIT_RESPONSE" "$STRICT_MODE"
