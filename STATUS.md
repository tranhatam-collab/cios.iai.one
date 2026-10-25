# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-10-25  
**Verdict:** HOLD — R1 candidate on PR; chờ Founder GO trên handoff `*.iai.one` trước deploy  
**RC branch:** `remediation/r1-working-product` — https://github.com/tranhatam-collab/cios.iai.one/pull/1 (`build-test` xanh)

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

- AIAgent: `https://api.aiagent.iai.one` → `POST /v1/agent/chat` (Fastify path; Workers chưa expose)
- Frontend: `site/js/api-client.js` → Workers

## Demo / auth

Demo seed **tắt** trên production trừ khi `ALLOW_DEMO_SEED=true` **và** secret `AUTH_DEMO_PASSWORD` được set.  
Không công bố mật khẩu production trong STATUS. Role register do server gán (`sales_rep`).

## R1 surface (Workers + D1)

- Auth: register role server-assigned; demo seed gated; JWT `jti` revoke; CORS allowlist
- Product reads: `/v1/bootstrap`, `/v1/overview`, `/v1/crm/organizations`, `/v1/discovery/*`, `/v1/compliance/audit`, `/v1/review/queue`
- Ngoài R1: Stripe/payment, Google OAuth, SSE, CRM write/import/enrich

## Cloudflare account lock

Production Pages/Workers: account `f3f9…` (domain `cios.iai.one`). CI dùng `secrets.CLOUDFLARE_ACCOUNT_ID` — không hard-code account khác.

## Secrets / bindings (ops)

- Required Worker secrets: `JWT_SECRET`, `FLOW_WEBHOOK_SECRET` (`wrangler secret put`)
- Optional: `CIOS_KV` (D1 revoke fallback OK); `ALLOW_DEMO_SEED` + `AUTH_DEMO_PASSWORD` staging only
- GitHub: `CLOUDFLARE_ACCOUNT_ID` = account `f3f9…`; staging `SMOKE_WORKERS_API_URL` + `SMOKE_WORKERS_JWT_SECRET`

## Open

- [ ] Founder GO trên workspace handoff `docs/ops/status/IAI_ONE_MASTER_HANDOFF_AND_DEV_PLAN_2026-10-16.md` trước deploy R1
- [ ] Confirm staging smoke secrets in GitHub Actions
- [ ] Verify AIAgent với `AIAGENT_API_KEY` (R2)
