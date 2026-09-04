# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-09-04
**Verdict:** Production HOLD; source-only remediation, runtime integration BLOCKED

## Team AI / CI correction — 2026-09-04

The former readiness claim is withdrawn. Provider adapter tests and a source
build do not prove authenticated Workers/provider execution or deployment.
CI now separates source validation from an explicitly requested staging smoke.
Automatic Pages production deployment was removed from the proposed patch.
This change is uncommitted and requires integration/release-owner review.

The write-capable smoke requires `WORKERS_SMOKE_ENVIRONMENT=staging`,
`WORKERS_SMOKE_WRITE_ACK=STAGING_ONLY`, an explicit isolated HTTPS
`WORKERS_API_URL`, and `JWT_SECRET` from the staging secret store. CI uses
`SMOKE_WORKERS_JWT_SECRET`, optional `SMOKE_WORKERS_FLOW_WEBHOOK_SECRET`, and
`SMOKE_WORKERS_API_URL` in the protected `staging` environment. No production
default or dummy signing secret is accepted as runtime evidence. A configured
endpoint still needs Ops identity/isolation verification before execution.

Remaining runtime gates: credential issuance, actual staging smoke, provider
run/receipt/cost reconciliation, exact deployment identity, rollback receipt,
independent QA and Founder authorization. They are not completed by this patch.

## Canonical API

| Layer | URL |
|-------|-----|
| Frontend | `https://cios.iai.one` |
| Workers API | `https://cios-workers-api.tranhatam.workers.dev` |
| Fly API | `https://cios-api.fly.dev` — **không dùng** (DNS dead) |

## Path lock (QA)

- `POST /v1/auth/session` — không viết `/auth`
- `GET /v1/auth/me` — không viết `/me`
- `GET /v1/meta`, `GET /v1/system/health`

## Integrations

- AIAgent: `https://api.aiagent.iai.one` → `POST /v1/agent/chat`
- Frontend: `site/js/api-client.js` → Workers

## Demo

`admin@iai.one` / `demo123456` / workspace `demo`

## Open

- [ ] Verify AIAgent với `AIAGENT_API_KEY`
- [ ] UI copy audit vs i18n registry
