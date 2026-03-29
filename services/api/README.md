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
  - `envelope.ts` (uniform response contract)

## Implemented Contract Routes (Current)

- `GET /v1/system/state`
- `GET /v1/system/health`
- `GET /v1/system/metrics`
- `POST /v1/events/ingest` (operator+, idempotency)
- `POST /v1/simulations/run` (operator+)
- `POST /v1/governance/approvals` (governor+)
- `POST /v1/flow/dispatch` (governor+, idempotency)
- `POST /v1/flow/callback`
- `GET /v1/governance/audit` (governor+)
- `GET /v1/flow/logs` (governor+)
- `GET /v1/reports/hourly` (observer+)

## Next Implementation Steps

1. Replace token role parsing with real JWT verification and claims mapping
2. Bind routes to real domain repositories (D1 data reads/writes)
3. Add structured audit for denied/failed auth attempts
4. Implement full route set from phase-2 contract map
5. Add callback signature verification for external flow webhooks
