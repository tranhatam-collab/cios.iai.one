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
