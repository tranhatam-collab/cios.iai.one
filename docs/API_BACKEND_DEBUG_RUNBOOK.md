# CIOS API Backend — Runbook triển khai và gỡ lỗi

**Cập nhật:** 2026-07-10  
**Chuẩn ngôn ngữ:** `iai.one-platform/content/iai-language-standard-lock.md`  
**Khóa path auth:** chỉ báo cáo `/v1/auth/*` — không viết `/auth` hoặc `/me` thiếu tiền tố.

---

## English reference

**Updated:** 2026-07-10  
**Language authority:** `iai.one-platform/content/iai-language-standard-lock.md`  
**Auth path lock:** report `/v1/auth/*` only — never `/auth` or `/me` without prefix.

---

## Nguyên nhân gốc đã sửa

1. **Path probe sai** — dùng `GET /v1/system/health` và `GET /v1/meta`; không chỉ dựa vào `/health` cho contract phase2.
2. **Frontend gọi `/v1/auth/*` tương đối trên Pages** — đã chuyển sang `site/js/api-client.js` → URL Workers.
3. **Workers thiếu route auth** — đã thêm `POST /v1/auth/session`, `POST /v1/auth/register`, `GET /v1/auth/me`, `POST /v1/auth/logout`, `GET /v1/meta`, `GET /health`.
4. **`wrangler.toml`** — sửa D1 id `d4f3a44d-...`; tắt KV binding lỗi.
5. **Fly `cios-api.fly.dev`** — DNS chết; Workers là API canonical hiện tại.

## Root causes fixed

1. **Wrong probe paths** — use `GET /v1/system/health` and `GET /v1/meta`.
2. **Frontend relative `/v1/auth/*` on Pages** — now via `site/js/api-client.js` → Workers URL.
3. **Workers missing auth routes** — added full `/v1/auth/*` set plus `/v1/meta` and `/health`.
4. **`wrangler.toml`** — fixed D1 id; disabled broken KV binding.
5. **Fly `cios-api.fly.dev`** — DNS dead; Workers is canonical API.

---

## URL live

| Dịch vụ | URL |
|---------|-----|
| Frontend | `https://cios.iai.one` |
| Workers API | `https://cios-workers-api.tranhatam.workers.dev` |
| Health | `GET /v1/system/health` hoặc `GET /health` |
| Meta | `GET /v1/meta` |

| Service | URL |
|---------|-----|
| Frontend | `https://cios.iai.one` |
| Workers API | `https://cios-workers-api.tranhatam.workers.dev` |
| Health | `GET /v1/system/health` or `GET /health` |
| Meta | `GET /v1/meta` |

---

## Lệnh triển khai

```bash
cd cios.iai.one

# 1. Workers API
cd services/api
npm install --legacy-peer-deps
npx wrangler secret put JWT_SECRET    # bắt buộc một lần
npx wrangler deploy

# 2. Frontend Pages
cd ../..
npm run deploy:pages

# 3. Smoke (cần JWT_SECRET trong .env)
JWT_SECRET=... npm run smoke:workers:strict
```

---

## Đăng nhập demo

- Email: `admin@iai.one`
- Mật khẩu: `demo123456`
- Workspace: `demo`

---

## Kiểm chứng

```bash
curl -s https://cios-workers-api.tranhatam.workers.dev/v1/meta | jq .ok
curl -s -X POST https://cios-workers-api.tranhatam.workers.dev/v1/auth/session \
  -H 'content-type: application/json' \
  -d '{"email":"admin@iai.one","password":"demo123456","workspaceCode":"demo"}' | jq .

npm run smoke:workers
npm run smoke:workers:strict
```

---

## Trạng thái — 2026-07-10

- `JWT_SECRET` đã cấu hình trên Cloudflare Workers
- `POST /v1/auth/session`, `GET /v1/auth/me`, `POST /v1/auth/logout` live
- CORS bật cho `cios.iai.one` → Workers
- Pages và Workers đã redeploy

## Status — 2026-07-10

- `JWT_SECRET` configured on Cloudflare Workers
- `POST /v1/auth/session`, `GET /v1/auth/me`, `POST /v1/auth/logout` live
- CORS enabled for `cios.iai.one` → Workers
- Pages and Workers redeployed

---

## Fly.io — tùy chọn

`cios-api.fly.dev` không resolve DNS. Để khôi phục:

```bash
fly apps list
fly deploy
```
