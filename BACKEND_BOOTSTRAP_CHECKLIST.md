# CUSTOMER INTELLIGENCE OS
## BACKEND BOOTSTRAP CHECKLIST
Phiên bản: v1
Mục tiêu: Hướng dẫn DEV dựng backend từ đầu theo đúng thứ tự, tránh làm sai nền móng.

==================================================
I. NGUYÊN TẮC BOOTSTRAP
==================================================

1. Dựng nền trước, viết business sau
2. Ưu tiên:
- env
- app bootstrap
- database
- auth
- workspace context
- permission foundation
- domain core
3. Không viết workflow, AI, export quá sớm khi auth và tenant isolation chưa xong
4. Mỗi bước phải chạy test hoặc smoke test trước khi sang bước tiếp theo
5. File nào tạo ra phải usable ngay, không để file rỗng quá nhiều

==================================================
II. STACK MẶC ĐỊNH CHO CHECKLIST NÀY
==================================================

Giả định:
- Node.js 20+
- TypeScript
- Fastify hoặc Express
- PostgreSQL
- pnpm hoặc npm
- Docker optional
- Migration SQL hoặc tool migration riêng

Ví dụ bên dưới dùng `pnpm` cho gọn.
Nếu dùng `npm` thì đổi tương đương.

==================================================
III. GIAI ĐOẠN 0: CHUẨN BỊ MÁY DEV
==================================================

## 0.1 Cài công cụ
Cần có:
- Node.js 20 trở lên
- pnpm hoặc npm
- PostgreSQL
- Git
- VS Code hoặc IDE tương đương
- Docker nếu muốn chạy local dễ hơn

## 0.2 Kiểm tra phiên bản
Chạy từng lệnh này trong Terminal:

```bash
node -v
pnpm -v
git --version
psql --version
````

Nếu thiếu PostgreSQL local, có thể dùng Docker.

## 0.3 Tạo thư mục repo

Ví dụ:

```bash
mkdir customer-intelligence-backend
cd customer-intelligence-backend
git init
```

==================================================
IV. GIAI ĐOẠN 1: KHỞI TẠO REPO
==============================

## 1.1 Tạo package.json

Chạy:

```bash
pnpm init
```

## 1.2 Cài dependency runtime

Ví dụ nếu dùng Fastify:

```bash
pnpm add fastify @fastify/cors @fastify/helmet @fastify/cookie @fastify/jwt pg zod dotenv pino pino-pretty uuid
```

Nếu dùng Express thì đổi stack tương ứng, nhưng nên thống nhất một stack từ đầu.

## 1.3 Cài dependency dev

```bash
pnpm add -D typescript tsx @types/node eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin vitest
```

## 1.4 Tạo tsconfig

Chạy:

```bash
npx tsc --init
```

Sau đó chỉnh lại file `tsconfig.json`.

## 1.5 Tạo cấu trúc thư mục gốc

Tạo các thư mục này:

```bash
mkdir -p src/app
mkdir -p src/bootstrap
mkdir -p src/config
mkdir -p src/core
mkdir -p src/domains
mkdir -p src/modules
mkdir -p src/infra
mkdir -p src/interfaces/http/routes
mkdir -p src/interfaces/http/middlewares
mkdir -p src/interfaces/http/controllers
mkdir -p src/interfaces/http/dto
mkdir -p src/interfaces/http/validators
mkdir -p src/interfaces/http/serializers
mkdir -p src/jobs
mkdir -p src/workers
mkdir -p src/scripts
mkdir -p src/types
mkdir -p src/utils
mkdir -p tests/unit
mkdir -p tests/integration
mkdir -p tests/e2e
mkdir -p docs
mkdir -p openapi
mkdir -p migrations
```

## 1.6 Tạo file gốc

Tạo các file:

* `.gitignore`
* `.env.example`
* `README.md`
* `src/index.ts`
* `src/app/create-app.ts`
* `src/bootstrap/env.ts`
* `src/bootstrap/logger.ts`
* `src/bootstrap/db.ts`

==================================================
V. GIAI ĐOẠN 2: CẤU HÌNH CƠ BẢN
===============================

## 2.1 Tạo .gitignore

File: `.gitignore`

Nên có:

```gitignore
node_modules
dist
.env
coverage
.pnpm-store
.DS_Store
*.log
```

## 2.2 Tạo .env.example

File: `.env.example`

Nội dung tối thiểu:

```env
NODE_ENV=development
PORT=3000
APP_NAME=customer-intelligence-os-api
APP_BASE_URL=http://localhost:3000

DATABASE_URL=postgres://postgres:postgres@localhost:5432/customer_intelligence
JWT_SECRET=replace_me
SESSION_SECRET=replace_me
LOG_LEVEL=debug

REDIS_URL=redis://localhost:6379
STORAGE_BUCKET=local-bucket
STORAGE_REGION=local
```

## 2.3 Tạo README.md

Chưa cần dài, nhưng phải có:

* dự án là gì
* cách chạy local
* lệnh cài dependency
* lệnh start dev
* lệnh migrate

## 2.4 Chỉnh package.json scripts

Thêm scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

==================================================
VI. GIAI ĐOẠN 3: ENV VALIDATION
===============================

## 3.1 Tạo file env validator

File: `src/bootstrap/env.ts`

Mục tiêu:

* đọc env
* validate bằng zod
* export config typed

## 3.2 DEV phải làm ngay

* Không đọc `process.env.X` lung tung khắp codebase
* Chỉ đọc env ở 1 nơi duy nhất
* Export object config đã validate

## 3.3 Smoke test

Sau khi viết xong `env.ts`, tạo tạm `src/index.ts` chỉ để log app name và port rồi chạy:

```bash
pnpm dev
```

Nếu load env lỗi, sửa ngay ở bước này.

==================================================
VII. GIAI ĐOẠN 4: LOGGER
========================

## 4.1 Tạo logger

File: `src/bootstrap/logger.ts`

Mục tiêu:

* tạo logger trung tâm
* dev mode log dễ đọc
* prod mode log JSON

## 4.2 Quy tắc

* Không dùng `console.log` tràn lan
* Route, service, worker đều dùng logger chung
* Không log token, password, secret

## 4.3 Test

Trong `src/index.ts`, import logger và log message boot thành công.

==================================================
VIII. GIAI ĐOẠN 5: APP BOOTSTRAP CƠ BẢN
=======================================

## 5.1 Tạo file app chính

File: `src/app/create-app.ts`

Mục tiêu:

* tạo server instance
* register plugins cơ bản
* register health route

## 5.2 Tạo file entry

File: `src/index.ts`

Mục tiêu:

* load env
* init logger
* create app
* listen port

## 5.3 Route đầu tiên

Tạo health route:

* `GET /health`

Response:

```json
{
  "ok": true,
  "service": "customer-intelligence-os-api"
}
```

## 5.4 Test

Chạy:

```bash
pnpm dev
```

Mở:

* `http://localhost:3000/health`

Chỉ khi route này chạy ổn mới sang DB.

==================================================
IX. GIAI ĐOẠN 6: DATABASE CONNECTION
====================================

## 6.1 Tạo database local

Trong Terminal:

```bash
createdb customer_intelligence
```

Nếu dùng Docker PostgreSQL thì dựng container trước.

## 6.2 Tạo file DB client

File: `src/bootstrap/db.ts`

Mục tiêu:

* tạo pg pool
* export db client
* có hàm health check

## 6.3 Tạo route test DB

Ví dụ:

* `GET /health/db`

Route chạy query:

```sql
SELECT NOW();
```

## 6.4 Test

Chạy:

```bash
pnpm dev
```

Mở:

* `/health/db`

Phải trả OK rồi mới sang migrations.

==================================================
X. GIAI ĐOẠN 7: MIGRATIONS FOUNDATION
=====================================

## 7.1 Tạo file migration đầu tiên

Thư mục: `migrations/`

Tạo file:

* `0001_init.sql`

Lúc đầu có thể chỉ tạo:

* extensions
* helper function
* workspaces
* users
* workspace_members

## 7.2 Tạo script chạy migration

File:

* `src/scripts/run-migrations.ts`

Script này:

* đọc file SQL
* chạy theo thứ tự
* log migration nào đã chạy

## 7.3 Tạo bảng migration history

Ngay từ đầu nên có bảng:

* `schema_migrations`

## 7.4 Thêm script package.json

```json
{
  "db:migrate": "tsx src/scripts/run-migrations.ts"
}
```

## 7.5 Chạy migration

```bash
pnpm db:migrate
```

## 7.6 Kiểm tra DB

Dùng psql hoặc GUI để xác nhận bảng đã có.

==================================================
XI. GIAI ĐOẠN 8: REQUEST CONTEXT
================================

## 8.1 Tạo request context middleware

Thư mục:

* `src/interfaces/http/middlewares/request-context.middleware.ts`

Mục tiêu:

* gắn request_id
* gắn logger child theo request
* chuẩn hóa context object

## 8.2 Tạo workspace middleware placeholder

File:

* `src/interfaces/http/middlewares/workspace.middleware.ts`

Tạm thời có thể chỉ đọc `X-Workspace-Id`

## 8.3 Tạo auth middleware placeholder

File:

* `src/interfaces/http/middlewares/auth.middleware.ts`

Tạm thời có thể mock user để dựng flow trước, nhưng phải thay bằng JWT thật ở giai đoạn auth.

==================================================
XII. GIAI ĐOẠN 9: AUTH FOUNDATION
=================================

## 9.1 Tạo module auth

Thư mục:

```text
src/modules/auth/
```

File đầu tiên:

* `auth.service.ts`
* `auth.routes.ts`
* `auth.validators.ts`
* `auth.types.ts`

## 9.2 Tạo endpoints đầu tiên

* `POST /v1/auth/login`
* `GET /v1/auth/me`

## 9.3 Lúc này có thể làm đơn giản

* user table
* verify email/password mock hoặc hardcoded dev seed
* trả JWT

## 9.4 Không được bỏ qua

* middleware verify token
* map token sang user thật
* không trust role từ client

## 9.5 Test

* login thành công
* login fail
* me khi có token
* me khi không có token

==================================================
XIII. GIAI ĐOẠN 10: WORKSPACE CONTEXT THẬT
==========================================

## 10.1 Hoàn thiện workspace middleware

Mục tiêu:

* lấy current workspace từ auth context hoặc header
* check user có là member workspace không
* attach workspace vào request context

## 10.2 Các lỗi phải có

* workspace không tồn tại
* user không thuộc workspace
* workspace bị deleted
* member bị suspended

## 10.3 Test bắt buộc

* user A không vào được workspace B
* request không có workspace context bị chặn đúng nơi cần chặn

==================================================
XIV. GIAI ĐOẠN 11: PERMISSION ENGINE
====================================

## 11.1 Tạo core permission engine

Thư mục:

* `src/core/policies/permission-engine.ts`

## 11.2 Tạo permission middleware

File:

* `src/interfaces/http/middlewares/permission.middleware.ts`

## 11.3 Tạo permission seeds

Trong DB:

* permissions
* role_permissions

## 11.4 Test

* sales_rep không được export approve
* readonly không được patch organization
* compliance_admin vào được compliance endpoints

==================================================
XV. GIAI ĐOẠN 12: DOMAIN ĐẦU TIÊN
=================================

Thứ tự domain nên dựng:

1. organization
2. contact
3. lead
4. task

## 12.1 Dựng domain organization

Tạo thư mục:

```text
src/domains/organization/
```

Tạo file:

* organization.types.ts
* organization.repository.ts
* organization.service.ts
* organization.validators.ts
* organization.serializer.ts
* organization.policy.ts
* organization.errors.ts
* index.ts

## 12.2 Route organization

Tạo:

* `GET /v1/organizations`
* `POST /v1/organizations`
* `GET /v1/organizations/:id`
* `PATCH /v1/organizations/:id`
* `DELETE /v1/organizations/:id`

## 12.3 Test

* list theo workspace
* create organization
* patch organization
* soft delete organization
* tenant isolation

==================================================
XVI. GIAI ĐOẠN 13: CONTACTS / LEADS / TASKS
===========================================

## 13.1 Dựng contact domain

Tương tự organization

## 13.2 Dựng lead domain

Tương tự organization, thêm scoring fields

## 13.3 Dựng task domain

Tương tự organization

## 13.4 Test luồng cơ bản

* create contact thuộc organization
* create lead từ organization/contact
* assign lead owner
* create task follow-up cho lead

==================================================
XVII. GIAI ĐOẠN 14: SOURCE LAYER FOUNDATION
===========================================

Sau khi CRUD lõi ổn mới dựng lớp nguồn.

## 14.1 Tạo domain:

* source-record
* lineage
* source-governance
* crawl

## 14.2 Bắt đầu từ cái dễ nhất

Dựng:

* domain_policies CRUD
* crawl_jobs create/list/detail
* source_records read/list
* field_lineage read/list

## 14.3 Tuyệt đối chưa làm ở bước này

* crawler phức tạp
* stealth scraping
* bypass logic
* auto expand vô hạn

## 14.4 Test

* domain policy deny chặn crawl job create
* source record query đúng workspace
* field lineage hiện đúng theo entity

==================================================
XVIII. GIAI ĐOẠN 15: SEARCH
===========================

## 15.1 Tạo module search

File:

* search.service.ts
* search.routes.ts
* search.validators.ts

## 15.2 Bước đầu

Cho search bằng SQL indexed trước cũng được.
Chưa cần engine search riêng nếu chưa đến mức cần.

## 15.3 Dựng saved views

* create saved view
* list saved views
* update
* delete

==================================================
XIX. GIAI ĐOẠN 16: AI FOUNDATION
================================

## 16.1 Tạo module AI

Thư mục:

```text
src/modules/ai/
```

## 16.2 Chưa gọi provider thật quá sớm

Làm abstraction trước:

* ai-provider.interface.ts
* ai-provider.mock.ts
* ai-enrichment.service.ts

## 16.3 Endpoints đầu tiên

* `POST /v1/ai-enrichments/generate`
* `GET /v1/ai-enrichments`
* `GET /v1/model-versions`

## 16.4 Quy tắc

* AI output lưu ở `ai_enrichments`
* không ghi vào `source_records`
* phải có model_version
* phải có confidence

==================================================
XX. GIAI ĐOẠN 17: SCORING / SIGNALS
===================================

## 17.1 Dựng signal domain

* signal_events list/create internal

## 17.2 Dựng scoring domain

* lead_scores
* recompute score service
* score history endpoint

## 17.3 Test

* recompute score không làm hỏng lead record
* score history lưu nhiều phiên bản
* plan thấp không được dùng advanced scoring nếu policy chặn

==================================================
XXI. GIAI ĐOẠN 18: COMPLIANCE FOUNDATION
========================================

Đây là phần bắt buộc trước export/workflow/outreach.

## 18.1 Dựng module compliance

Tạo:

* legal-basis service
* suppression service
* deletion-request service
* retention service

## 18.2 Endpoints đầu tiên

* `GET /v1/suppression-list`
* `POST /v1/suppression-list`
* `POST /v1/suppression-list/check`
* `POST /v1/deletion-requests`
* `GET /v1/deletion-requests`
* `POST /v1/deletion-requests/:id/approve`
* `POST /v1/deletion-requests/:id/complete`

## 18.3 Test rất quan trọng

* suppression check hoạt động thật
* deletion request không complete khi chưa approved
* legal_basis record đọc và ghi đúng workspace

==================================================
XXII. GIAI ĐOẠN 19: AUDIT
=========================

## 19.1 Tạo audit module

* audit.service.ts
* audit.writer.ts
* audit.events.ts

## 19.2 Tích hợp tối thiểu ngay

Audit các action:

* login
* create/update/delete organization
* create/update/delete contact
* create/update/delete lead
* suppression add
* deletion approve/complete

## 19.3 Quy tắc

* audit không làm fail request chính
* nhưng không được “mất hẳn” không biết
* nên có fallback log hoặc queue

==================================================
XXIII. GIAI ĐOẠN 20: EXPORT FOUNDATION
======================================

## 20.1 Chỉ làm khi compliance đã có

Tạo module export:

* export.service.ts
* export.routes.ts
* export.policy.ts
* export.worker.ts

## 20.2 Endpoint đầu tiên

* `POST /v1/exports/request`
* `GET /v1/exports`
* `POST /v1/exports/:id/approve`
* `GET /v1/exports/:id`

## 20.3 Quy tắc

* không generate file ngay ở request thread nếu nặng
* enqueue export worker
* signed URL hết hạn
* log mọi export

==================================================
XXIV. GIAI ĐOẠN 21: WORKFLOW FOUNDATION
=======================================

## 21.1 Tạo module workflows

* workflow.service.ts
* workflow-run.service.ts
* workflow.registry.ts
* workflow.executor.ts

## 21.2 Endpoints đầu tiên

* `GET /v1/workflows`
* `POST /v1/workflows`
* `POST /v1/workflows/:id/run`
* `GET /v1/workflows/:id/runs`

## 21.3 Bước đầu chỉ cần vài workflow type

* score_recompute
* export_review
* suppression_sync

Không cần ôm hết toàn bộ từ đầu.

==================================================
XXV. GIAI ĐOẠN 22: JOBS / WORKERS
=================================

## 22.1 Khi nào mới dựng worker

Khi đã có queue abstraction và ít nhất 1 job async thật.

## 22.2 Worker đầu tiên nên là

* export.worker.ts
  hoặc
* scoring.worker.ts

## 22.3 Cron job đầu tiên nên là

* retention-cleanup.job.ts
  hoặc
* score-recompute.job.ts

==================================================
XXVI. GIAI ĐOẠN 23: CONNECTORS / WEBHOOKS / API KEYS
====================================================

Làm sau cùng trong phase nền.

## 23.1 Connectors

Tạo CRUD basic

## 23.2 Webhooks

Tạo:

* create webhook
* update webhook
* test webhook

## 23.3 API keys

Tạo:

* create API key
* list API key metadata
* revoke API key

Quy tắc:

* key secret chỉ hiện 1 lần
* DB chỉ lưu hash

==================================================
XXVII. GIAI ĐOẠN 24: TESTING BẮT BUỘC TRƯỚC KHI MỞ RỘNG
=======================================================

Trước khi build thêm features lớn, phải có test tối thiểu cho:

1. auth
2. workspace isolation
3. permission middleware
4. organization CRUD
5. contact CRUD
6. lead CRUD
7. suppression check
8. deletion lifecycle
9. export request flow
10. workflow run idempotency

==================================================
XXVIII. THỨ TỰ FILE NÊN TẠO ĐẦU TIÊN
====================================

Tạo theo đúng thứ tự này:

1. `.gitignore`
2. `.env.example`
3. `package.json`
4. `tsconfig.json`
5. `README.md`
6. `src/bootstrap/env.ts`
7. `src/bootstrap/logger.ts`
8. `src/bootstrap/db.ts`
9. `src/app/create-app.ts`
10. `src/index.ts`
11. `src/interfaces/http/routes/health.routes.ts`
12. `src/scripts/run-migrations.ts`
13. `migrations/0001_init.sql`
14. `src/interfaces/http/middlewares/request-context.middleware.ts`
15. `src/interfaces/http/middlewares/auth.middleware.ts`
16. `src/interfaces/http/middlewares/workspace.middleware.ts`
17. `src/core/policies/permission-engine.ts`
18. `src/interfaces/http/middlewares/permission.middleware.ts`
19. `src/domains/organization/*`
20. `src/domains/contact/*`
21. `src/domains/lead/*`
22. `src/domains/task/*`

Sau đó mới sang:
23. source-governance
24. source-record
25. lineage
26. ai
27. scoring
28. compliance
29. exports
30. workflows

==================================================
XXIX. THỨ TỰ LỆNH DEV NÊN CHẠY
==============================

## Bước 1

Khởi tạo repo:

```bash
mkdir customer-intelligence-backend
cd customer-intelligence-backend
git init
pnpm init
```

## Bước 2

Cài package:

```bash
pnpm add fastify @fastify/cors @fastify/helmet @fastify/cookie @fastify/jwt pg zod dotenv pino pino-pretty uuid
pnpm add -D typescript tsx @types/node eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin vitest
```

## Bước 3

Tạo tsconfig:

```bash
npx tsc --init
```

## Bước 4

Tạo thư mục:

```bash
mkdir -p src/app src/bootstrap src/config src/core src/domains src/modules src/infra src/interfaces/http/routes src/interfaces/http/middlewares src/interfaces/http/controllers src/interfaces/http/dto src/interfaces/http/validators src/interfaces/http/serializers src/jobs src/workers src/scripts src/types src/utils tests/unit tests/integration tests/e2e docs openapi migrations
```

## Bước 5

Chạy dev server đầu tiên:

```bash
pnpm dev
```

## Bước 6

Tạo database:

```bash
createdb customer_intelligence
```

## Bước 7

Chạy migration:

```bash
pnpm db:migrate
```

## Bước 8

Chạy test:

```bash
pnpm test
```

## Bước 9

Typecheck:

```bash
pnpm typecheck
```

==================================================
XXX. CHECKLIST PASS TỪNG GIAI ĐOẠN
==================================

## Phase nền được coi là PASS khi:

* [ ] `/health` chạy
* [ ] `/health/db` chạy
* [ ] env validate ổn
* [ ] logger hoạt động
* [ ] migration chạy thành công
* [ ] auth login/me hoạt động
* [ ] workspace middleware hoạt động
* [ ] permission middleware hoạt động

## Phase domain core PASS khi:

* [ ] organization CRUD chạy
* [ ] contact CRUD chạy
* [ ] lead CRUD chạy
* [ ] task CRUD chạy
* [ ] tenant isolation test pass

## Phase compliance PASS khi:

* [ ] suppression add/check pass
* [ ] deletion request flow pass
* [ ] audit logs có ghi
* [ ] export request không bypass compliance

## Phase async PASS khi:

* [ ] queue chạy
* [ ] worker chạy
* [ ] workflow run có idempotency
* [ ] retry không loop vô hạn

==================================================
XXXI. CÁC LỖI DEV THƯỜNG GẶP PHẢI TRÁNH
=======================================

1. Tạo quá nhiều file trước khi có app chạy được
2. Viết business logic vào route
3. Chưa có workspace isolation đã làm search/global APIs
4. Chưa có suppression đã làm outreach/export
5. Chưa có audit đã cho admin actions
6. Chưa có migration runner mà sửa tay DB lung tung
7. Chưa có permission engine mà hardcode role trong từng route
8. Chưa có env validation mà đọc env trực tiếp khắp nơi
9. Chưa có test tenant isolation
10. Chưa có idempotency đã làm workflow run

==================================================
XXXII. KẾT LUẬN
===============

DEV phải dựng backend theo thứ tự:
nền kỹ thuật
→ auth
→ workspace
→ permission
→ domain core
→ source layer
→ AI/scoring
→ compliance
→ export
→ workflow
→ workers
→ connectors

Không được nhảy cóc sang tính năng hấp dẫn khi nền chưa vững.
Nếu nền lệch từ đầu, toàn bộ hệ sau này sẽ rất khó cứu.

END FILE
