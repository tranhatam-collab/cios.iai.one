# CIOS API Backend — Deploy & Debug Runbook
**Updated:** 2026-07-10

## Root causes fixed

1. **Wrong probe paths** — use `/v1/system/health` and `/v1/meta`, not `/health` alone for phase2 contract checks
2. **Frontend called relative `/v1/auth/*`** on Pages → now uses `site/js/api-client.js` → Workers URL
3. **Workers missing auth routes** — added `/v1/auth/session`, `/register`, `/me`, `/logout`, `/v1/meta`, `/health`
4. **wrangler.toml** — fixed D1 id `d4f3a44d-...`, disabled broken KV binding
5. **Fly `cios-api.fly.dev`** — still dead (DNS); Workers is canonical API for now

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://cios.iai.one |
| Workers API | https://cios-workers-api.tranhatam.workers.dev |
| Health | `GET /v1/system/health` or `GET /health` |
| Meta | `GET /v1/meta` |

## Deploy commands

```bash
cd cios.iai.one

# 1. Workers API
cd services/api
npm install --legacy-peer-deps
npx wrangler secret put JWT_SECRET    # required once
npx wrangler deploy

# 2. Frontend Pages
cd ../..
npm run deploy:pages
# or: npx wrangler pages deploy site --project-name=cios-iai-one --commit-dirty=true

# 3. Smoke (needs JWT_SECRET in .env)
JWT_SECRET=... npm run smoke:workers:strict
```

## Demo login

- Email: `admin@iai.one`
- Password: `demo123456`
- Workspace: `demo`

## Verify

```bash
curl -s https://cios-workers-api.tranhatam.workers.dev/v1/meta | jq .ok
curl -s -X POST https://cios-workers-api.tranhatam.workers.dev/v1/auth/session \
  -H 'content-type: application/json' \
  -d '{"email":"admin@iai.one","password":"demo123456","workspaceCode":"demo"}' | jq .

# Smoke (requires JWT_SECRET in .env)
npm run smoke:workers
npm run smoke:workers:strict
```

## Status (2026-07-10)

- JWT_SECRET configured on Cloudflare Workers
- Auth session/me/logout live
- CORS enabled for `cios.iai.one` → Workers
- Pages + Workers redeployed

## Fly.io (optional — full PostgreSQL API)

`cios-api.fly.dev` DNS does not resolve. To restore:

```bash
fly apps list
fly deploy   # from repo root with DATABASE_URL + secrets
```
