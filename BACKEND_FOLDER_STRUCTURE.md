# FILE: BACKEND_FOLDER_STRUCTURE.md

# CUSTOMER INTELLIGENCE OS
## BACKEND FOLDER STRUCTURE
Phiên bản: v1
Mục tiêu: Chuẩn hóa cấu trúc repo backend để build hệ thống production-ready theo hướng:
- multi-tenant
- compliance-first
- source lineage
- AI enrichment
- workflow engine
- billing
- audit
- export governance

==================================================
I. TRIẾT LÝ CẤU TRÚC BACKEND
==================================================

Repo backend phải được tổ chức theo domain rõ ràng, không gom tất cả vào một thư mục routes hoặc services chung chung.

Nguyên tắc:
1. Domain-driven structure
2. Tách app layer, domain layer, infra layer
3. Tách compliance và audit thành lớp lõi, không phải tiện ích phụ
4. Tách workflows, AI, crawl, exports thành modules riêng
5. Mọi module phải tenant-aware
6. Mọi module nhạy cảm phải audit-ready
7. Test và validation phải nằm cùng tư duy kiến trúc, không chắp vá về sau

==================================================
II. GIẢ ĐỊNH KỸ THUẬT
==================================================

Stack gợi ý:
- Node.js + TypeScript
- Fastify hoặc Hono hoặc Express chuẩn hóa
- PostgreSQL
- Redis
- Queue system
- Object storage
- OpenAPI docs
- Background workers riêng
- Optional Python AI workers sau này

Repo này là backend API chính.
Nếu có crawler nặng hoặc AI compute nặng, có thể tách microservices sau.
Nhưng ở phase đầu vẫn nên bắt đầu từ monorepo hoặc repo backend thống nhất.

==================================================
III. CẤU TRÚC THƯ MỤC TỔNG THỂ
==================================================

```text
backend/
├── src/
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── core/
│   ├── domains/
│   ├── modules/
│   ├── infra/
│   ├── interfaces/
│   ├── jobs/
│   ├── workers/
│   ├── scripts/
│   ├── types/
│   ├── utils/
│   └── index.ts
├── tests/
├── docs/
├── prisma-or-migrations/
├── openapi/
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── Dockerfile
````

==================================================
IV. GIẢI THÍCH TỪNG THƯ MỤC GỐC
===============================

## 1. src/app

Nơi ráp ứng dụng chính:

* register plugins
* register middlewares
* register routes
* boot app server

Không viết business logic ở đây.

## 2. src/bootstrap

Chứa logic khởi động:

* env validation
* logger init
* db init
* cache init
* queue init
* graceful shutdown

## 3. src/config

Chứa toàn bộ cấu hình:

* app config
* database config
* auth config
* billing config
* queue config
* rate limit config
* storage config
* AI config
* crawl config
* compliance config

## 4. src/core

Các lõi dùng chung:

* base errors
* result pattern
* pagination
* permissions engine
* plan gating engine
* audit contracts
* policy engine
* tenancy helpers

## 5. src/domains

Đây là phần quan trọng nhất.
Mỗi domain là một thư mục riêng.

## 6. src/modules

Dành cho các module cross-domain hoặc module lớn:

* auth
* audit
* compliance
* workflows
* search
* billing
* notifications
* exports

## 7. src/infra

Phần kết nối hạ tầng:

* db repositories
* cache
* queues
* storage
* email
* webhooks
* external providers

## 8. src/interfaces

Delivery layer:

* http
* api
* serializers
* dto
* request validators
* route bindings

## 9. src/jobs

Các cron jobs định kỳ.

## 10. src/workers

Các background worker consume queue.

## 11. src/scripts

Script dành cho devops / maintenance / seed.

## 12. src/types

Types dùng chung toàn hệ thống.

## 13. src/utils

Helper thuần kỹ thuật, không chứa domain logic.

==================================================
V. CẤU TRÚC DOMAIN BẮT BUỘC
===========================

Trong `src/domains/` nên có:

```text
src/domains/
├── workspace/
├── member/
├── organization/
├── contact/
├── lead/
├── opportunity/
├── pipeline/
├── task/
├── note/
├── activity/
├── source-governance/
├── crawl/
├── source-record/
├── lineage/
├── enrichment/
├── signal/
├── scoring/
├── consent/
├── suppression/
├── deletion-request/
├── retention/
├── workflow/
├── export/
├── connector/
├── webhook/
├── api-key/
├── notification/
├── audit-log/
├── privacy-event/
└── security-event/
```

==================================================
VI. CẤU TRÚC CHUẨN TRONG MỖI DOMAIN
===================================

Ví dụ domain `organization`:

```text
src/domains/organization/
├── organization.entity.ts
├── organization.types.ts
├── organization.constants.ts
├── organization.repository.ts
├── organization.service.ts
├── organization.policy.ts
├── organization.validators.ts
├── organization.serializer.ts
├── organization.events.ts
├── organization.errors.ts
└── index.ts
```

Ý nghĩa:

* `entity.ts`: mô hình domain
* `types.ts`: types riêng domain
* `constants.ts`: hằng số
* `repository.ts`: truy vấn DB
* `service.ts`: business logic
* `policy.ts`: permission / compliance logic riêng domain
* `validators.ts`: validate input domain
* `serializer.ts`: chuẩn hóa output API
* `events.ts`: domain events
* `errors.ts`: lỗi riêng domain
* `index.ts`: export tập trung

LƯU Ý:
Không nhét logic route trực tiếp vào domain.
Route ở interfaces/http.
Domain không phụ thuộc ngược vào HTTP framework.

==================================================
VII. CẤU TRÚC INTERFACES / HTTP
===============================

```text
src/interfaces/
├── http/
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── workspace.routes.ts
│   │   ├── organization.routes.ts
│   │   ├── contact.routes.ts
│   │   ├── lead.routes.ts
│   │   ├── opportunity.routes.ts
│   │   ├── pipeline.routes.ts
│   │   ├── task.routes.ts
│   │   ├── search.routes.ts
│   │   ├── source-governance.routes.ts
│   │   ├── crawl.routes.ts
│   │   ├── source-record.routes.ts
│   │   ├── ai.routes.ts
│   │   ├── workflow.routes.ts
│   │   ├── compliance.routes.ts
│   │   ├── export.routes.ts
│   │   ├── billing.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── audit.routes.ts
│   │   ├── connector.routes.ts
│   │   ├── webhook.routes.ts
│   │   ├── api-key.routes.ts
│   │   └── admin.routes.ts
│   ├── middlewares/
│   ├── dto/
│   ├── validators/
│   ├── serializers/
│   └── register-routes.ts
└── index.ts
```

### middlewares nên có

* auth.middleware.ts
* workspace.middleware.ts
* permission.middleware.ts
* plan.middleware.ts
* audit.middleware.ts
* idempotency.middleware.ts
* rate-limit.middleware.ts
* request-context.middleware.ts
* error-handler.middleware.ts

==================================================
VIII. CẤU TRÚC MODULES
======================

```text
src/modules/
├── auth/
├── billing/
├── compliance/
├── audit/
├── search/
├── workflows/
├── exports/
├── notifications/
├── ai/
└── analytics/
```

### auth

* login
* logout
* session
* token
* password reset
* MFA sau này

### billing

* plans
* subscriptions
* usage metering
* checkout
* billing provider sync

### compliance

* legal basis engine
* suppression engine
* deletion request flow
* retention evaluator
* outreach compliance check

### audit

* audit writer
* audit formatter
* audit event contracts

### search

* search query builder
* search filters
* saved views

### workflows

* workflow registry
* workflow executor
* run lifecycle
* retry logic
* dead-letter support

### exports

* export request
* approval flow
* export generation
* signed download link
* watermarking metadata

### notifications

* in-app notifications
* email alerts sau
* push integration sau

### ai

* AI provider abstraction
* model versions
* enrichment orchestration
* cost tracking

==================================================
IX. CẤU TRÚC INFRA
==================

```text
src/infra/
├── db/
│   ├── client.ts
│   ├── transaction.ts
│   ├── migrations/
│   └── repositories/
├── cache/
│   ├── redis.ts
│   └── cache-keys.ts
├── queue/
│   ├── queue-client.ts
│   ├── queue-topics.ts
│   └── enqueue.ts
├── storage/
│   ├── object-storage.ts
│   └── signed-url.ts
├── mail/
│   └── mailer.ts
├── webhooks/
│   └── webhook-dispatcher.ts
├── providers/
│   ├── billing/
│   ├── ai/
│   ├── search/
│   └── crawl/
└── logger/
    └── logger.ts
```

LƯU Ý:

* Domain service không gọi trực tiếp SDK bên ngoài nếu không qua adapter/provider
* Tất cả external dependency phải có abstraction layer
* Dễ mock khi test

==================================================
X. CẤU TRÚC JOBS
================

```text
src/jobs/
├── daily-discovery.job.ts
├── policy-check.job.ts
├── crawl-scheduler.job.ts
├── stale-refresh.job.ts
├── enrichment-refresh.job.ts
├── score-recompute.job.ts
├── suppression-sync.job.ts
├── retention-cleanup.job.ts
├── export-expiry.job.ts
└── metrics-rollup.job.ts
```

Mỗi job chỉ nên:

* nhận config
* enqueue work
* log metrics
* không ôm toàn bộ logic nặng

==================================================
XI. CẤU TRÚC WORKERS
====================

```text
src/workers/
├── crawl.worker.ts
├── parse.worker.ts
├── normalize.worker.ts
├── lineage.worker.ts
├── enrichment.worker.ts
├── scoring.worker.ts
├── export.worker.ts
├── webhook.worker.ts
├── notification.worker.ts
└── retention.worker.ts
```

Worker là nơi xử lý bất đồng bộ:

* queue consumer
* retry
* idempotency
* audit enqueue nếu cần

==================================================
XII. CẤU TRÚC CONFIG
====================

```text
src/config/
├── app.config.ts
├── env.schema.ts
├── db.config.ts
├── auth.config.ts
├── rate-limit.config.ts
├── queue.config.ts
├── storage.config.ts
├── billing.config.ts
├── ai.config.ts
├── crawl.config.ts
├── compliance.config.ts
└── feature-flags.config.ts
```

`env.schema.ts` phải validate toàn bộ biến môi trường ngay khi boot.
Không để thiếu env rồi chạy mập mờ.

==================================================
XIII. CẤU TRÚC CORE
===================

```text
src/core/
├── errors/
│   ├── app-error.ts
│   ├── validation-error.ts
│   ├── auth-error.ts
│   ├── permission-error.ts
│   ├── compliance-error.ts
│   └── rate-limit-error.ts
├── result/
│   └── result.ts
├── pagination/
│   ├── offset-pagination.ts
│   └── cursor-pagination.ts
├── policies/
│   ├── permission-engine.ts
│   ├── plan-gating.ts
│   ├── compliance-gating.ts
│   └── record-visibility.ts
├── tenancy/
│   ├── tenant-context.ts
│   └── tenant-guards.ts
├── audit/
│   ├── audit-contracts.ts
│   └── audit-actions.ts
└── constants/
    └── system.constants.ts
```

==================================================
XIV. TESTS
==========

```text
tests/
├── unit/
├── integration/
├── e2e/
├── fixtures/
├── factories/
└── helpers/
```

### unit

Test service, policy, validator, serializer

### integration

Test repository, DB, queue, external adapters mock

### e2e

Test full API flow:

* login
* create lead
* recompute score
* request export
* approve export
* deletion flow

BẮT BUỘC test các luồng:

* tenant isolation
* suppression blocking
* plan gating
* export approval
* deletion request lifecycle
* workflow idempotency

==================================================
XV. DOCS
========

```text
docs/
├── architecture.md
├── domain-model.md
├── compliance-model.md
├── workflow-lifecycle.md
├── audit-events.md
├── security-checklist.md
├── onboarding-dev.md
└── deployment.md
```

==================================================
XVI. OPENAPI
============

```text
openapi/
├── base.yaml
├── paths/
├── schemas/
└── examples/
```

Nên sinh docs API từ code hoặc đồng bộ 1 nguồn chuẩn.
Không để docs và code lệch nhau lâu dài.

==================================================
XVII. FILE GỐC NÊN CÓ
=====================

## package.json

Scripts tối thiểu:

* dev
* build
* start
* lint
* typecheck
* test
* test:unit
* test:integration
* test:e2e
* db:migrate
* db:seed
* openapi:generate

## .env.example

Phải có đầy đủ:

* DATABASE_URL
* REDIS_URL
* JWT_SECRET
* SESSION_SECRET
* STORAGE_BUCKET
* STORAGE_REGION
* BILLING_PROVIDER_KEYS
* AI_PROVIDER_KEYS
* APP_BASE_URL
* API_BASE_URL

## README.md

Phải giải thích:

* repo để làm gì
* cách chạy local
* cách migrate
* cách seed
* cách test
* flow boot hệ thống

==================================================
XVIII. CẤU TRÚC REQUEST FLOW
============================

Luồng chuẩn một request API:

1. Route nhận request
2. Middleware auth
3. Middleware workspace context
4. DTO validation
5. Permission check
6. Plan gating
7. Domain service xử lý
8. Repository save/query
9. Audit enqueue hoặc audit write
10. Serializer output
11. Response trả về

Không được:

* route gọi thẳng DB lung tung
* serializer tự truy DB
* middleware viết business logic sâu
* domain service phụ thuộc vào HTTP objects

==================================================
XIX. MẪU CẤU TRÚC 1 ROUTE
=========================

Ví dụ `organization.routes.ts`

```text
route
-> dto validator
-> auth middleware
-> workspace middleware
-> permission middleware
-> controller handler
-> organization.service
-> organization.repository
-> organization.serializer
-> response
```

### controller chỉ nên làm

* lấy input
* gọi service
* trả output

### service nên làm

* business logic
* policy checks phụ thêm
* orchestration
* audit intent
* emit events

### repository nên làm

* query DB
* không chứa business rule lớn

==================================================
XX. CẤU TRÚC EVENT-DRIVEN NỘI BỘ
================================

Nên có domain events nội bộ như:

* organization.created
* contact.updated
* lead.score.recomputed
* suppression.added
* export.approved
* workflow.run.completed
* deletion_request.completed

Vị trí:

```text
src/core/events/
src/domains/*/*.events.ts
```

Dùng để:

* tách side effects
* dễ mở rộng webhook
* dễ audit
* dễ notification

==================================================
XXI. LƯU Ý RẤT RÕ TRONG CODE
============================

1. Không để mọi thứ vào `services/` chung
   Phải chia domain rõ.

2. Không để `utils/` thành bãi rác
   Helper thuần kỹ thuật mới để ở utils.

3. Không để compliance nằm ngoài luồng chính
   Compliance phải gọi được từ domain services và middleware.

4. Không để audit là optional
   Các action nhạy cảm phải có audit contract.

5. Không để worker dùng lại code route kiểu chắp vá
   Worker dùng service / module dùng chung.

6. Không để SQL rải khắp dự án
   Nếu dùng query builder hoặc ORM, phải gom theo repository.
   Nếu raw SQL, cũng phải đóng trong repository.

7. Không để tenant filter bị quên
   Repository nào query nghiệp vụ cũng phải nhận workspace_id rõ ràng.

8. Không để plan gating chỉ nằm ở frontend
   Backend phải có layer plan-gating trung tâm.

9. Không để export và deletion request lẫn vào CRUD thường
   Phải có module riêng vì đây là hành động nhạy cảm.

10. Không để AI provider bị dính chặt vào business logic
    Phải có abstraction.
    Hôm nay dùng provider A, mai đổi provider B không được vỡ hệ.

11. Không để queues chạy mà không có idempotency
    Job retry phải an toàn.

12. Không để `admin` routes dùng chung logic thiếu guard
    Admin phải có guard riêng, audit riêng, policy riêng.

==================================================
XXII. CẤU TRÚC REPO GỢI Ý CHI TIẾT
==================================

```text
backend/
├── src/
│   ├── app/
│   │   ├── create-app.ts
│   │   ├── register-middlewares.ts
│   │   ├── register-modules.ts
│   │   └── register-routes.ts
│   ├── bootstrap/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   ├── cache.ts
│   │   ├── queue.ts
│   │   ├── logger.ts
│   │   └── shutdown.ts
│   ├── config/
│   ├── core/
│   ├── domains/
│   │   ├── organization/
│   │   ├── contact/
│   │   ├── lead/
│   │   ├── opportunity/
│   │   ├── pipeline/
│   │   ├── task/
│   │   ├── note/
│   │   ├── activity/
│   │   ├── source-record/
│   │   ├── lineage/
│   │   ├── signal/
│   │   ├── scoring/
│   │   ├── consent/
│   │   ├── suppression/
│   │   ├── deletion-request/
│   │   ├── retention/
│   │   ├── export/
│   │   ├── connector/
│   │   ├── webhook/
│   │   ├── api-key/
│   │   ├── notification/
│   │   ├── audit-log/
│   │   ├── privacy-event/
│   │   └── security-event/
│   ├── modules/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── compliance/
│   │   ├── search/
│   │   ├── workflows/
│   │   ├── ai/
│   │   ├── exports/
│   │   ├── notifications/
│   │   └── analytics/
│   ├── infra/
│   │   ├── db/
│   │   ├── cache/
│   │   ├── queue/
│   │   ├── storage/
│   │   ├── logger/
│   │   ├── mail/
│   │   ├── webhooks/
│   │   └── providers/
│   ├── interfaces/
│   │   └── http/
│   │       ├── routes/
│   │       ├── middlewares/
│   │       ├── dto/
│   │       ├── validators/
│   │       ├── serializers/
│   │       └── controllers/
│   ├── jobs/
│   ├── workers/
│   ├── scripts/
│   ├── types/
│   ├── utils/
│   └── index.ts
├── tests/
├── docs/
├── openapi/
├── migrations/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── Dockerfile
```

==================================================
XXIII. THỨ TỰ DỰNG REPO CHO DEV
===============================

Bước 1
Tạo repo backend trống với:

* package.json
* tsconfig
* eslint
* prettier
* env schema
* basic app bootstrap

Bước 2
Dựng:

* DB connection
* migration runner
* logger
* auth middleware
* workspace context middleware

Bước 3
Dựng domain đầu tiên:

* organization
* contact
* lead
* task

Bước 4
Dựng:

* search
* source-record
* source governance
* crawl jobs

Bước 5
Dựng:

* AI enrichment
* scoring
* signals

Bước 6
Dựng:

* compliance
* suppression
* deletion request
* exports
* audit

Bước 7
Dựng:

* workflows
* workers
* cron jobs
* notifications
* connectors

==================================================
XXIV. KẾT LUẬN
==============

Repo backend này phải đủ sạch để:

* dễ scale
* dễ audit
* dễ test
* dễ bàn giao
* dễ thêm AI
* dễ thêm compliance
* dễ thêm enterprise features

Không dựng repo kiểu nhanh lúc đầu rồi vài tuần sau thành đống hỗn loạn.
Phải dựng chuẩn từ đầu như một nền tảng hạ tầng dài hạn.

END FILE
