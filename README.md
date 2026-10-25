# CIOS.IAI.ONE — Constitutional Intelligence Operating System

**Hệ điều hành trí tuệ tuân thủ hiến pháp** — enterprise intelligence product trong hệ `*.iai.one`.

**Trạng thái vận hành:** xem `STATUS.md`

---

## English reference

Enterprise intelligence product under the IAI ecosystem. Canonical API is Cloudflare Workers.

---

## Live stack

| Layer | Technology | URL |
|-------|------------|-----|
| Frontend | Cloudflare Pages (`site/`) | `https://cios.iai.one` |
| API (canonical) | Cloudflare Workers + D1 | `https://cios-workers-api.tranhatam.workers.dev` |
| Auth | JWT via Workers `/v1/auth/*` | See path lock in `STATUS.md` |
| AIAgent | `api.aiagent.iai.one` | R2 backlog |

**Không dùng:** `cios-api.fly.dev` (DNS dead), Fly Fastify cho R1.  
**Verdict:** xem `STATUS.md` (HOLD tới Founder GO trên handoff `*.iai.one`).

---

## Quick start (dev)

```bash
npm ci
cp .env.example .env
npm run typecheck && npm test
cd services/api && npm ci && npm run typecheck
```

## Deploy + smoke

- Không deploy production cho đến Founder GO trên `IAI_ONE_MASTER_HANDOFF…`
- `npm run smoke:workers:readonly` (CI-safe)
- `docs/API_BACKEND_DEBUG_RUNBOOK.md`

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
