# services/api

Cloudflare Workers API scaffold for CIOS phase-2 contract.

## Contract Sources

- `docs/API_WORKERS_PHASE2_CONTRACT.md`
- `services/api/contracts/openapi.v1.workers.yaml`

## Local Run

```bash
cd services/api
npm install
npm run dev
```

Wrangler config is in `services/api/wrangler.toml`.

## Persistence Bindings (Phase 2)

- D1 binding: `CIOS_DB` (primary for idempotency + audit persistence)
- KV binding: `CIOS_KV` (fallback persistence and TTL-based storage)

If D1 is unavailable, worker falls back to KV; if KV is unavailable, it falls back to in-memory buffers.

## JWT Verification (Phase 2)

- JWT verification mode: HS256
- Required secret: `JWT_SECRET` (set via `wrangler secret put JWT_SECRET`)
- Optional context checks:
  - `JWT_ISSUER` (`iss` claim)
  - `JWT_AUDIENCE` (`aud` claim)

Role mapping accepts direct CIOS roles (`observer|operator|governor|root`) and maps legacy roles (`owner/admin/compliance_admin/sales_manager/sales_rep/...`) into the phase-2 role ladder.

## Flow Callback Signature

- Optional secret: `FLOW_WEBHOOK_SECRET` (set via `wrangler secret put FLOW_WEBHOOK_SECRET`)
- If configured, `POST /v1/flow/callback` requires:
  - header: `x-flow-signature`
  - value: `hex(HMAC_SHA256(raw_json_body, FLOW_WEBHOOK_SECRET))`

## Current Status

- Worker entry scaffolded in `services/api/src/worker.ts`
- Response envelope locked: `ok`, `data`, `meta`, `error`, `trace_id`
- Critical route contract is live as protected stubs with validation/RBAC/idempotency
- Shared modules added in `services/api/src/lib/`:
  - `auth.ts` (JWT bearer parsing + role guard)
  - `validation.ts` (required field checks)
  - `idempotency.ts` (header + payload conflict guard)
  - `rate-limit.ts` (sensitive endpoint throttling)
  - `audit.ts` (audit trail persistence with D1/KV fallback)
  - `persistence.ts` (D1 schema bootstrap for worker persistence)
  - `domain-store.ts` (D1/KV-backed storage for ingested events and flow logs)
  - `contracts.ts` (route-level payload contract validators)
  - `envelope.ts` (uniform response contract)

## Implemented Contract Routes (Current)

- `GET /v1/system/state`
- `GET /v1/system/health`
- `GET /v1/system/metrics` (aggregated from D1 events/audit/flow logs with time window)
- `POST /v1/events/ingest` (operator+, idempotency)
- `GET /v1/events/search` (observer+, D1 text/source/type + time slicing)
- `POST /v1/simulations/run` (operator+)
- `POST /v1/governance/approvals` (governor+)
- `POST /v1/flow/dispatch` (governor+, idempotency)
- `POST /v1/flow/callback`
- `GET /v1/governance/audit` (governor+)
- `GET /v1/flow/logs` (governor+)
- `GET /v1/reports/hourly` (observer+, hourly D1 aggregation with pagination + time filters)
- `POST /v1/data/query` (operator+, D1 multi-dimension query surface)

## Next Implementation Steps

1. Replace token role parsing with real JWT verification and claims mapping
2. Bind routes to real domain repositories (D1 data reads/writes)
3. Add structured audit for denied/failed auth attempts
4. Implement full route set from phase-2 contract map
5. Add callback signature verification for external flow webhooks
