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
- Route stubs created for critical phase-2 endpoints
- Shared modules added in `services/api/src/lib/`:
  - `auth.ts` (JWT bearer parsing + role guard)
  - `validation.ts` (required field checks)
  - `idempotency.ts` (header + payload conflict guard)
  - `rate-limit.ts` (sensitive endpoint throttling)
  - `audit.ts` (audit trail buffer for critical actions)
  - `envelope.ts` (uniform response contract)

## Next Implementation Steps

1. Wire D1 bindings and repositories
2. Implement JWT verification with role mapping
3. Add validation for ingest/simulation/governance/dispatch payloads
4. Persist audit logs and idempotency keys
5. Implement flow callback state mapping
