# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-07-10  
**Verdict:** Sẵn sàng vận hành

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
