# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-10-26  
**Verdict:** R1 **LIVE** on Workers+Pages (account `f3f9…`); CI+CD xanh trên `main`; ecosystem handoff still not whole-system `GO`

**RC:** `main@e56bdd3` (CI/CD green run [40339746459](https://github.com/tranhatam-collab/cios.iai.one/actions/runs/40339746459); prior green `e066838`/`40338919524`)  
**Worker version:** `649de2f0-5737-4cd1-91f8-f08c6f8bcd7b`  
**Pages deployment:** `https://a9de5b66.cios-iai-one-3ai.pages.dev` → `https://cios.iai.one`

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

## CI / CD (main)

- Triggers: `push` + `workflow_dispatch`
- Jobs: `build-test` → `Smoke Workers Readonly` → parallel `Deploy Cloudflare Workers API` + `Deploy Cloudflare Pages`
- Receipt `e56bdd3` / run `40339746459` (and `e066838` / `40338919524`): all four jobs **success** (2026-10-26)
- Post-deploy live: `/health` + `/v1/system/health` 200; product reads 401 without JWT; `POST /v1/auth/session` validates; homepage honesty OK

## Open / R2

- [x] Harden CI Workers `npm ci` peer deps (`--legacy-peer-deps`)
- [x] Pages deploy independent of Workers job; `workflow_dispatch` chạy smoke+CD
- [ ] Prefer durable Cloudflare **API token** for GitHub (OAuth token can expire)
- [ ] Verify AIAgent với `AIAGENT_API_KEY` (R2)
- [ ] Stripe / Google OAuth / SSE (R2)
