# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-10-26  
**Verdict:** R1 **LIVE** on Workers+Pages (account `f3f9…`); ecosystem handoff still not whole-system `GO`

**RC:** `main@80edde1` (merge PR #1) + local follow-up CD fix  
**Worker version:** `62f8ff79-9a90-455b-8c25-cae81a2f3476`  
**Pages deployment:** `https://999add6d.cios-iai-one-3ai.pages.dev` → `https://cios.iai.one`

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

- AIAgent: `https://api.aiagent.iai.one` → R2 backlog on Workers
- Frontend: `site/js/api-client.js` → Workers

## Demo / auth

Demo seed **tắt** trên production trừ khi `ALLOW_DEMO_SEED=true` **và** secret `AUTH_DEMO_PASSWORD` được set.  
Không công bố mật khẩu production trong STATUS. Role register do server gán (`sales_rep`); open register luôn workspace `demo`.

## R1 surface (Workers + D1) — LIVE

- Auth: register role server-assigned; demo seed gated; JWT `jti` revoke; CORS allowlist; `FLOW_WEBHOOK_SECRET` set
- Product reads: `/v1/bootstrap`, `/v1/overview`, `/v1/crm/organizations`, `/v1/discovery/*`, `/v1/compliance/audit`, `/v1/review/queue`
- Ngoài R1: Stripe/payment, Google OAuth, SSE, CRM write/import/enrich

## Cloudflare account lock

Production Pages/Workers: account `f3f9e76222dcb488d5e303e29e8ba192` (domain `cios.iai.one`).  
GitHub Actions: `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` + `SMOKE_WORKERS_API_URL`.

## Secrets / bindings (ops)

- Required Worker secrets: `JWT_SECRET`, `FLOW_WEBHOOK_SECRET` (`wrangler secret put`)
- Optional: `CIOS_KV` (D1 revoke fallback OK); `ALLOW_DEMO_SEED` + `AUTH_DEMO_PASSWORD` staging only

## Open / R2

- [ ] Harden CI Workers `npm ci` peer deps (`--legacy-peer-deps` patch)
- [ ] Verify AIAgent với `AIAGENT_API_KEY` (R2)
- [ ] Stripe / Google OAuth / SSE (R2)
