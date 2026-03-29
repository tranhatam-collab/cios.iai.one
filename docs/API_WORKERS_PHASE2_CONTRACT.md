# API_WORKERS_PHASE2_CONTRACT.md

## Purpose

This document locks the Cloudflare Workers API contract for CIOS Phase 2 (after schema lock).  
DEV must implement exactly from this contract before expanding simulation/governance depth.

## Runtime and Boundaries

- Runtime: Cloudflare Workers
- Data authority: database schema migrations in `infra/migrations` (or current `migrations`)
- API is the only business write surface for app/admin
- UI must not bypass API to access storage directly

## Global API Rules

### Base

- Base prefix: `/v1`
- Content type: `application/json`
- Every response uses envelope:
  - `ok: boolean`
  - `data: object | array | null`
  - `meta: object`
  - `error: { code, message, details? } | null`
  - `trace_id: string`

### Auth

- Auth mechanism: JWT bearer
- JWT verification: HS256 signature + `exp/nbf` checks + optional `iss/aud` checks (`JWT_ISSUER`, `JWT_AUDIENCE`)
- RBAC roles:
  - `observer`
  - `operator`
  - `governor`
  - `root`

### Mandatory behavior

- pagination (`page`, `page_size`)
- filtering (`filter[...]`)
- sorting (`sort_by`, `sort_order`)
- time range (`from`, `to`)
- validation on all write routes
- standardized error contract
- audit log on all critical writes
- idempotency key required for ingest/trigger/dispatch routes

### Error codes (minimum)

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_FAILED`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `IDEMPOTENCY_CONFLICT`
- `INTERNAL_ERROR`

## Route Groups

### System

- `GET /v1/system/state`
- `GET /v1/system/metrics`
- `GET /v1/system/snapshots`
- `GET /v1/system/health`

### Entity

- `GET /v1/entities`
- `GET /v1/entities/:id`
- `GET /v1/entities/:id/relations`
- `GET /v1/entities/:id/events`
- `GET /v1/entities/:id/scores`

### Event

- `GET /v1/events`
- `POST /v1/events/ingest`
- `GET /v1/events/types`
- `GET /v1/events/search`

### Risk

- `GET /v1/risks`
- `GET /v1/risks/signals`
- `GET /v1/risks/summary`
- `GET /v1/risks/alerts`

### Scoring

- `GET /v1/scores`
- `GET /v1/scores/types`
- `POST /v1/scores/recalculate`

### Data Query

- `GET /v1/data/sources`
- `GET /v1/data/jobs`
- `POST /v1/data/query`
- `GET /v1/data/search`
- `POST /v1/data/filters`

### Simulation

- `GET /v1/simulations`
- `POST /v1/simulations/run`
- `POST /v1/simulations/compare`
- `GET /v1/simulations/:id`

### Decision

- `GET /v1/decisions`
- `GET /v1/decisions/recommendations`
- `GET /v1/decisions/:id`

### Governance

- `GET /v1/governance/requests`
- `POST /v1/governance/approvals`
- `GET /v1/governance/audit`
- `POST /v1/governance/rollback`

### Reporting

- `GET /v1/reports`
- `GET /v1/reports/jobs`
- `GET /v1/reports/daily`
- `GET /v1/reports/hourly`

### Flow Integration

- `GET /v1/flow/triggers`
- `POST /v1/flow/dispatch`
- `GET /v1/flow/logs`

## Permission Matrix (Locked)

- `observer`: read-only routes (system/entity/event/risk/reporting read)
- `operator`: observer + ingest + data query + run simulation
- `governor`: operator + governance approvals/rollback + decision-sensitive routes
- `root`: full access + policy/security/admin actions

Route-level minimum:

- `POST /v1/events/ingest` -> `operator+`
- `POST /v1/simulations/run` -> `operator+`
- `POST /v1/governance/approvals` -> `governor+`
- `POST /v1/governance/rollback` -> `governor+`
- `POST /v1/flow/dispatch` -> `governor+`

## Request Contracts (Minimum Required Fields)

### `POST /v1/events/ingest`

- `idempotency_key` (required)
- `source`
- `event_type`
- `occurred_at`
- `payload`
- `entity_refs[]`

### `POST /v1/simulations/run`

- `scenario_name`
- `base_state_ref`
- `input_parameters`
- `time_horizon`
- `assumptions`

### `POST /v1/governance/approvals`

- `request_id`
- `decision` (`approve` | `reject`)
- `reason`
- `evidence_refs[]`

### `POST /v1/flow/dispatch`

- `idempotency_key` (required)
- `trigger_name`
- `source_decision_id`
- `source_simulation_id` (nullable)
- `payload`
- `priority`
- `expected_callback`
- `requested_by`
- `approved_by` (required for sensitive actions)

## Callback Contract (Flow -> CIOS)

Callback route (worker webhook):

- `POST /v1/flow/callback`

Required callback fields:

- `flow_run_id`
- `trigger_name`
- `status` (`queued` | `running` | `success` | `failed` | `cancelled`)
- `result`
- `error` (nullable)
- `completed_at`
- `trace_id`

## Audit Scope (Mandatory)

Must audit:

- ingest writes
- score recalculation
- simulation run/compare
- governance approvals and rollback
- flow dispatch + callback status transitions
- permission-denied attempts on protected routes

## Rate Limiting and Idempotency

- Sensitive routes rate-limited per user + per IP
- Idempotency key retention window: 24h minimum
- Duplicate idempotency key with different payload -> `IDEMPOTENCY_CONFLICT`

## Deliverables Checklist (Phase 2)

- full route table with method/path/role
- request schema and response schema for each write route
- error contract implementation complete
- trace_id propagation end-to-end
- audit logging on all critical actions
- callback/status mapping for Flow integration routes
