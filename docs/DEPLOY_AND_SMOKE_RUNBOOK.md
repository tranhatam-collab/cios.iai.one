# DEPLOY AND SMOKE RUNBOOK

Customer Intelligence OS - Phase 1 Operations Flow

Version: v1

---

## 1) Muc tieu

Tai lieu nay chot quy trinh van hanh chuan cho moi lan release:

1. migrate
2. deploy
3. smoke strict
4. rollback neu can

Muc tieu:

- giam deployment risk
- phat hien loi som bang smoke test bat buoc
- co rollback path ro rang

---

## 2) Pham vi

Runbook nay ap dung cho:

- Backend chinh (`src/` - Fastify + PostgreSQL)
- Workers API (`services/api/` - Cloudflare Workers + D1 + KV)
- Pages frontend (`site/` deploy qua Wrangler Pages)

---

## 3) Dieu kien truoc deploy

Bat buoc truoc khi bat dau:

1. Code da merge/sync branch can deploy
2. `npm run typecheck` pass
3. `npm test` pass
4. Co file `.env` hop le (hoac bien moi truong tuong duong)
5. Cloudflare account dung (`CLOUDFLARE_ACCOUNT_ID`)
6. Secrets da set:
   - `JWT_SECRET` (workers)
   - `FLOW_WEBHOOK_SECRET` (neu bat callback signature)

Khuyen nghi:

- Chup nhanh `git status --short` truoc deploy de tranh deploy tu worktree khong mong muon.

---

## 4) Thu tu van hanh chuan

Luon theo dung thu tu nay:

1. migrate database
2. deploy backend/services
3. deploy frontend
4. chay smoke strict
5. quyet dinh go/no-go

---

## 5) Buoc 1 - Migrate

Chay migration cho backend chinh:

```bash
npm run db:migrate
```

Neu fail:

- dung quy trinh, khong deploy tiep
- xu ly ket noi DB / quyen / migration conflict
- chay lai den khi pass

Migrations hien tai quan trong cho Phase 1:

- `migrations/0005_review_queue.sql`
- `migrations/0006_review_audit_realtime.sql`
- `migrations/0007_flow_runs.sql`
- `migrations/0008_realtime_event_store.sql`

---

## 6) Buoc 2 - Deploy

### 6.1 Deploy Workers API

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy
```

Run trong thu muc:

- `services/api`

Kiem tra expected output:

- co Worker URL
- co Version ID moi
- khong con loi binding D1/KV

### 6.2 Deploy Pages frontend

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy:pages
```

Run trong root repo.

Kiem tra expected output:

- co Pages deployment URL moi

---

## 7) Buoc 3 - Smoke strict (bat buoc)

Chay 1 lenh:

```bash
npm run smoke:workers:strict
```

Script se tu dong chay full chuoi:

1. `/v1/system/health`
2. `/v1/events/ingest`
3. `/v1/events/search`
4. `/v1/flow/dispatch`
5. `/v1/flow/callback`
6. `/v1/flow/logs`
7. `/v1/governance/audit`

Che do strict se fail neu:

- thieu event moi trong `flow_logs` (khong co du `accepted` + `success` cho flow run vua tao)
- thieu audit success cho:
  - `flow_dispatch`
  - `flow_callback`

### 7.1 Tieu chi pass

- command exit code = 0
- output JSON co `ok: true` cho cac buoc critical
- strict checks khong bao `STRICT_CHECK_FAILED`

### 7.2 Tieu chi fail

- command exit code != 0
- co `STRICT_CHECK_FAILED`
- endpoint health fail
- callback signature fail (khi bat enforcement)

Neu fail: rollback theo muc 9.

---

## 8) Go / No-Go gate

Chi "GO" khi tat ca dieu kien dung:

1. migrate pass
2. workers deploy pass
3. pages deploy pass
4. smoke strict pass

Neu 1 trong 4 fail => "NO-GO" va rollback.

---

## 9) Rollback runbook

### 9.1 Rollback Workers API

1. Liet ke versions:

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler versions list
```

2. Rollback ve version on dinh gan nhat:

```bash
CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler rollback <version_id>
```

3. Verify lai:

```bash
curl -sS "https://<worker-url>/v1/system/health"
```

### 9.2 Rollback Pages

Rollback qua Cloudflare Pages dashboard (chọn deployment on dinh truoc),
hoac redeploy commit cu.

### 9.3 Rollback DB migration

Khuyen nghi hien tai: rollback theo migration script co kiem soat tay (manual SQL),
vi duoc thiet ke one-way cho release safety.

Chi tiet rollback-safe cho tung migration xem tai:

- `migrations/ROLLBACK_NOTES.md`

Bat buoc truoc rollback DB:

1. backup snapshot
2. xac nhan anh huong du lieu
3. duyet boi owner/compliance admin

---

## 10) Post-deploy verification

Sau khi GO:

1. theo doi logs 15-30 phut dau
2. check audit stream cho:
   - `flow_dispatch`
   - `flow_callback`
3. check realtime endpoints:
   - `/realtime/stream`
   - `/realtime/events/since/:eventId`
4. check user-facing critical routes:
   - auth session
   - crm organizations
   - compliance evaluate/review

---

## 11) Lenh chuan tong hop

Tai root repo:

```bash
npm run typecheck
npm test
npm run db:migrate
```

Deploy workers:

```bash
cd services/api
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy
```

Deploy pages:

```bash
cd /path/to/cios.iai.one
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy:pages
```

Smoke strict:

```bash
npm run smoke:workers:strict
```

---

## 12) Known failure patterns

1. `ECONNREFUSED` khi migrate

- DB chua mo / sai `DATABASE_URL`

2. `JWT_SECRET is not configured` tren workers

- chua set wrangler secret `JWT_SECRET`

3. callback 401 sau khi bat signature

- thieu `x-flow-signature`
- signature sai
- thieu `x-workspace-id`

4. smoke strict fail

- flow logs chua co du accepted/success
- audit chua co ban ghi success cho trace moi

---

## 13) Definition of deploy success

Mot deploy duoc coi la thanh cong khi:

- migration hoan tat
- workers/pages deploy thanh cong
- smoke strict pass
- khong co alert nghiem trong trong giai doan post-deploy
