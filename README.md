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
**Verdict:** xem `STATUS.md` — R1 Founder GO 2026-10-27 tại `main@c0b350f`; handoff toàn hệ `*.iai.one` vẫn tách riêng.

---

## Quick start (dev)

```bash
npm ci
cp .env.example .env
npm run typecheck && npm test
cd services/api && npm ci && npm run typecheck
```

## Deploy + smoke

- Production deploy chỉ từ `main` qua CI (push `main` = deploy). Mỗi baseline mới cần Founder GO trước khi push (R1: GO 2026-10-27 @ `c0b350f`; xem `STATUS.md`)
- `npm run smoke:workers:readonly` và `npm run smoke:pages` (read-only); đặt `EXPECTED_COMMIT=<sha>` để kiểm edge đang chạy đúng build
- `npm run e2e:local`: E2E đầy đủ trên Worker thật (`wrangler dev` chế độ local) với D1 cục bộ, không chạm Cloudflare/production; cũng là một cổng của CI (`e2e-local`) trước khi deploy
- Workflow `Credential health` (hằng tuần, chỉ GET) kiểm token Cloudflare của CI còn hợp lệ trước khi cần deploy
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
