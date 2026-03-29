# services/api

Cloudflare Workers API scaffold for CIOS phase-2 contract.

## Contract Sources

- `docs/API_WORKERS_PHASE2_CONTRACT.md`
- `services/api/contracts/openapi.v1.workers.yaml`

## Current Status

- Worker entry scaffolded in `services/api/src/worker.ts`
- Response envelope locked: `ok`, `data`, `meta`, `error`, `trace_id`
- Route stubs created for critical phase-2 endpoints

## Next Implementation Steps

1. Wire D1 bindings and repositories
2. Implement JWT verification with role mapping
3. Add validation for ingest/simulation/governance/dispatch payloads
4. Persist audit logs and idempotency keys
5. Implement flow callback state mapping
