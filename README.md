# CIOS.IAI.ONE — Constitutional Intelligence Operating System

**Hệ điều hành trí tuệ tuân thủ hiến pháp** — enterprise intelligence product trong hệ `*.iai.one`.

**Trạng thái vận hành:** xem `STATUS.md`

---

## English reference

Enterprise intelligence product under the IAI ecosystem. Canonical API is Cloudflare Workers.

---

## Live stack (2026-07-10)

| Layer | Technology | URL |
|-------|------------|-----|
| Frontend | Cloudflare Pages (`site/`) | `https://cios.iai.one` |
| API (canonical) | Cloudflare Workers | `https://cios-workers-api.tranhatam.workers.dev` |
| Auth | JWT via Workers `/v1/auth/*` | See path lock in `STATUS.md` |
| AIAgent | `api.aiagent.iai.one` | `POST /v1/agent/chat` |

**Không dùng:** `cios-api.fly.dev` (DNS dead), `api.cios.iai.one` (chưa canonical).

---

## Quick start (dev)

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## Deploy + smoke

- `docs/API_BACKEND_DEBUG_RUNBOOK.md`
- `npm run smoke:workers`
- `npm run smoke:workers:strict`

## Structure

```text
site/              ← Pages frontend (live)
services/api/      ← Workers API (canonical)
src/               ← Fastify app (Fly — optional, not live)
docs/              ← Runbooks
```

## Contributing

Tuân thủ `iai.one-platform/content/iai-language-standard-lock.md` và path lock `/v1/auth/*` trong mọi báo cáo.

Phiên bản: v1.1.0
