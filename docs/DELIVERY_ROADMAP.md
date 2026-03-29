# Delivery Roadmap

## Objective

Transition `cios.iai.one` from API/web-shell baseline to full Civilization Intelligence Operating System delivery.

## Current Baseline (Already Built)

- API foundation (`/health`, `/v1/meta`, version headers)
- Compliance policies and legal pages
- Auth/session with JWT
- RBAC enforcement for protected endpoints
- Initial audit trail for auth/session events
- Seeded domain APIs for CRM/compliance/discovery

## Phase 1 — Foundation (Execution Priority: Immediate)

### Architecture

- establish target multi-app + multi-service structure
- isolate public/app/admin responsibilities
- freeze canonical shared model package

### Product

- system state dashboard v1
- event ingest API v1
- scoring v1 (trust/stress/risk indexes)

### Platform

- cloudflare-first runtime plan (Workers + D1 + R2 + Queues)
- migration strategy from current PostgreSQL baseline to target D1 models

## Phase 2 — Intelligence

- anomaly detection service
- trend and stress analysis
- simulation workspace v1
- decision queue and recommendation APIs
- flow dispatch contracts (`cios -> flow`)

## Phase 3 — Governance OS

- approval matrix engine
- policy lifecycle and rollout controls
- evidence chain and rollback path
- expanded audit exports and governance timeline
- multi-role operational console hardening

## Non-Negotiable Gate Criteria

- no release without simulation + governance together
- no release with mock data as primary source
- no release without audit lineage on critical decisions
- no release where CIOS duplicates Flow automation responsibility
