CUSTOMER INTELLIGENCE OPERATING SYSTEM

SYSTEM ARCHITECTURE DIAGRAM AND COMPONENTS

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU

Khóa kiến trúc tổng thể để tất cả team build cùng một hướng, tránh lệch giữa:

- API monolith hiện tại (`src/`)
- Workers API contract (`services/api/`)
- Frontend shell/PWA
- Data Intelligence + Compliance + Decision + Workflow

==================================================
II. SYSTEM CONTEXT DIAGRAM

```text
Users (Web/App/Admin)
  -> Frontend Shell (site/app)
  -> API Gateway Layer
     -> Core API (src/*)
     -> Workers API (services/api/*)
  -> Domain Services
     -> IDWS (Identity/Workspace)
     -> DIS (Data Intelligence)
     -> ECS (Entity/CRM)
     -> CCS (Compliance/Charter)
     -> DSS (Scoring/Decision)
     -> WFS (Workflow/Flow bridge)
  -> Data Stores
     -> PostgreSQL (current)
     -> D1/KV (workers phase)
     -> Object Storage (proof/export)
  -> Event Bus / Queue
     -> Realtime Publisher
     -> Worker Consumers
  -> External Systems
     -> flow.iai.one
     -> legal/public data sources
```

==================================================
III. LOGICAL LAYERS

1. Interface Layer

- Web/App/Admin UI
- Realtime subscribers (SSE first)

2. API & Contract Layer

- REST endpoints
- response envelope chuẩn
- event contracts

3. Domain Layer

- Auth/RBAC
- CRM entities
- Discovery/Governance
- Compliance/CEE
- Scoring/Decision
- Workflow orchestration

4. Data & Evidence Layer

- transactional DB
- lineage/proof refs
- audit logs

5. Async/Execution Layer

- queue/workers
- flow dispatch/callback
- scheduled jobs

==================================================
IV. COMPONENT INVENTORY (CURRENT VS TARGET)

Current implemented:

- Fastify API bootstrap, auth/session, RBAC basics, health/meta routes
- CRM/compliance/discovery seed endpoints
- migrations 0001-0004
- workers contract skeleton with JWT/idempotency/audit/rate-limit

Target missing components:

- unified API envelope across all routes
- CEE decision service (allow/deny/review_required)
- review queue lifecycle
- lineage-first source-record pipeline (6 layers)
- realtime channels (SSE) to frontend
- full workflow dispatch loop with obligations

==================================================
V. RUNTIME DIAGRAM (REQUEST PATH)

```text
UI Action
  -> API Gateway
  -> Auth + Workspace + Permission
  -> Compliance/CEE Gate (if sensitive)
  -> Domain Service
  -> Repository
  -> Response Envelope
  -> Audit Event
  -> Realtime Event (if state changed)
```

==================================================
VI. RUNTIME DIAGRAM (ASYNC PATH)

```text
Domain Event
  -> Event Bus
  -> Worker
  -> Data update / external call (Flow)
  -> Callback
  -> State update
  -> Audit linkage
  -> Realtime notification
```

==================================================
VII. TRUST & GOVERNANCE CHECKPOINTS

Mandatory checkpoints:

- Source governance before crawl
- Traceability before export/outreach
- CEE before sensitive action
- Audit log for allow/deny/review
- Rollback reference for risky merge/dispatch

==================================================
VIII. NON-NEGOTIABLE BOUNDARY RULES

1. Frontend không quyết định enforcement.
2. Không bypass CEE qua internal route.
3. Không dùng inferred low-confidence làm source truth.
4. Không export khi thiếu traceability phù hợp.
5. Không để cross-tenant event/data leakage.

==================================================
IX. DEFINITION OF ARCHITECTURE DONE

Kiến trúc được coi là đạt khi:

- API, workers, UI cùng dùng chung contract
- mọi action nhạy cảm đi qua compliance + constitutional gate
- pipeline dữ liệu đi đủ 6 lớp intelligence
- realtime phản ánh đúng state thay đổi
- flow dispatch có callback + audit linkage đầy đủ

END FILE
