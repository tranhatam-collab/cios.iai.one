CUSTOMER INTELLIGENCE OPERATING SYSTEM

PHASE 1 EXECUTION PLAN

Version: v1
Type: TECHNICAL HANDOFF (EXECUTION BACKLOG)

==================================================
I. MỤC TIÊU FILE NÀY

File này chuyển toàn bộ bộ spec hiện tại thành backlog triển khai cụ thể cho Phase 1.

Mục tiêu của Phase 1:

- khóa backend foundation để build tiếp không lệch hướng
- tạo 1 vertical slice chạy thật end-to-end
- đảm bảo compliance, audit, traceability có mặt ngay từ đầu
- tránh build song song 2 hệ không cần thiết

==================================================
II. PHẠM VI PHASE 1 ĐƯỢC KHÓA

Phase 1 chỉ tập trung vào các năng lực sau:

1. Identity + Workspace + Auth
2. Canonical API contract
3. CRM foundation tối thiểu
4. Discovery + Governance foundation
5. Compliance gate cơ bản (CEE-lite)
6. Audit trail nền tảng
7. Review queue cơ bản
8. Realtime Phase 1 qua SSE
9. 1 Flow dispatch path có callback
10. Seed data + tests + dev bootstrap

Không làm trong Phase 1:

- simulation engine đầy đủ
- scoring engine hoàn chỉnh
- full entity resolution engine
- advanced AI enrichment
- full mobile app
- full enterprise SSO/private deployment

==================================================
III. QUYẾT ĐỊNH TRIỂN KHAI CHO PHASE 1

3.1 Runtime chính

Phase 1 dùng:

- Backend chính: `src/` (Fastify + PostgreSQL)
- Workers API trong `services/api/` giữ vai trò contract sandbox / phase kế tiếp

  3.2 Source of truth

Trong Phase 1, source of truth là:

- migrations trong thư mục `migrations/`
- route/runtime trong `src/`
- tài liệu contract trong:
  - `SYSTEM_ARCHITECTURE_DIAGRAM_AND_COMPONENTS.md`
  - `DATA_INTELLIGENCE_ENGINE_SPEC.md`
  - `COMPLIANCE_AND_CONSTITUTIONAL_FLOW.md`
  - `REALTIME_INTEGRATION_PLAN.md`
  - `DATABASE_SCHEMA_AND_SERVICE_BOUNDARIES_MASTER.md`
  - `API_RESPONSE_SHAPES_AND_EVENT_CONTRACTS.md`

  3.3 Vertical slice cần ship ở cuối Phase 1

Use case chuẩn phải chạy được:

1. user đăng nhập vào workspace
2. xem danh sách organizations và discovery sources
3. tạo 1 action nhạy cảm giả lập (ví dụ flow dispatch hoặc export suggestion)
4. action đi qua compliance gate
5. hệ trả về `allow`, `deny`, hoặc `review_required`
6. nếu `review_required` thì tạo review item
7. reviewer xử lý review item
8. audit log ghi đủ request/result/reason
9. UI nhận update qua SSE

==================================================
IV. CURRENT BASELINE

Đã có:

- Fastify bootstrap
- health/meta/auth/member/crm/compliance/discovery routes cơ bản
- JWT auth + role guard cơ bản
- PostgreSQL migrations `0001` -> `0004`
- test pass
- typecheck pass
- Workers API contract skeleton
- bộ spec và handoff nền tảng

Chưa đủ để ship Phase 1:

- response envelope chưa đồng nhất toàn bộ
- error contract chưa khóa ở toàn API
- chưa có CEE thật
- chưa có review queue lifecycle thật
- chưa có SSE realtime path
- chưa có 1 flow dispatch path end-to-end trong runtime chính
- chưa có tenant isolation + compliance integration tests đủ mạnh

==================================================
V. WORKSTREAMS CHÍNH

WS1. API Contract Hardening
WS2. Identity / Workspace Foundation Cleanup
WS3. CRM + Discovery + Governance Foundation
WS4. Compliance / CEE-lite + Review Queue
WS5. Realtime Phase 1 (SSE)
WS6. Flow Bridge Phase 1
WS7. Testing / Observability / Dev Bootstrap

==================================================
VI. BACKLOG CHI TIẾT THEO WORKSTREAM

VI.A. WS1. API CONTRACT HARDENING

Mục tiêu:

- mọi route Phase 1 trả response đồng nhất
- mọi lỗi có `error.code` + `request_id`

Tasks:

- [ ] tạo helper response envelope dùng chung cho `src/`
- [ ] chuẩn hóa tất cả route hiện có về shape:
  - `ok`
  - `data`
  - `meta`
  - `error`
  - `request_id`
- [ ] chuẩn hóa danh mục `error.code`
- [ ] thêm request/trace id middleware
- [ ] bổ sung test 200/400/401/403/404 envelope consistency

Definition of done:

- không còn route Phase 1 trả bare object/bare array
- mọi lỗi backend trả được code ổn định
- test contract pass

Dependencies:

- none

---

VI.B. WS2. IDENTITY / WORKSPACE FOUNDATION CLEANUP

Mục tiêu:

- auth, member, role, workspace nhất quán với Phase 1

Tasks:

- [ ] rà soát role mapping giữa `src/` và `services/api/`
- [ ] khóa canonical role list cho Phase 1
- [ ] thêm permission matrix tối thiểu cho:
  - auth/session
  - crm read
  - discovery read
  - compliance read
  - review approve/reject
  - flow dispatch
- [ ] chuẩn hóa auth audit success/fail
- [ ] thêm test tenant/workspace mismatch

Definition of done:

- role names không mâu thuẫn giữa docs và code
- mọi protected route có RBAC test

Dependencies:

- WS1

---

VI.C. WS3. CRM + DISCOVERY + GOVERNANCE FOUNDATION

Mục tiêu:

- biến seed APIs thành foundation có state rõ ràng

Tasks:

- [ ] khóa schema phase 1 cho:
  - organizations
  - source_records
  - discovery_sources hoặc source_candidates
  - crawl_governance_decisions
  - compliance_audit_logs
  - retention_rules
- [ ] thêm migration nếu schema hiện tại chưa đủ state cần thiết
- [ ] đảm bảo discovery record có tối thiểu:
  - candidate_type
  - source_url/domain
  - discovery_method
  - discovered_at
  - preliminary_confidence
  - governance_state
- [ ] đảm bảo governance decision có:
  - decision
  - reason
  - decided_at
  - actor/engine
- [ ] expose read APIs cho organizations/discovery/governance theo envelope chuẩn

Definition of done:

- records có state đủ cho downstream compliance/review
- CRM và discovery không còn chỉ là demo fallback surface

Dependencies:

- WS1
- WS2

---

VI.D. WS4. COMPLIANCE / CEE-LITE + REVIEW QUEUE

Mục tiêu:

- mọi action nhạy cảm Phase 1 phải đi qua gate chuẩn

Tasks:

- [ ] tạo `CEE-lite` service với input model tối thiểu:
  - actor_id
  - actor_role
  - workspace_id
  - action_type
  - action_class
  - target_object_type
  - target_object_id
  - target_record_confidence
  - target_traceability_status
  - target_compliance_status
  - target_source_governance_state
  - review_status
  - trace_id
- [ ] output chuẩn:
  - decision = `allow | deny | review_required`
  - reasons[]
  - policy_refs[]
  - obligations[]
- [ ] tạo review queue schema + repository + route
- [ ] action Phase 1 cần gate:
  - flow dispatch
  - export suggestion
  - low-confidence outreach suggestion
  - governance override giả lập
- [ ] audit mọi decision
- [ ] reviewer approve/reject review item
- [ ] test matrix cho allow/deny/review_required

Definition of done:

- không còn action nhạy cảm đi thẳng mà không audit/gate
- review item được tạo thật khi cần
- reviewer xử lý được item và sinh audit trail

Dependencies:

- WS1
- WS2
- WS3

---

VI.E. WS5. REALTIME PHASE 1 (SSE)

Mục tiêu:

- UI nhận được live updates cho các state quan trọng nhất

Tasks:

- [ ] tạo SSE endpoint Phase 1
- [ ] event family tối thiểu:
  - `review.created`
  - `review.updated`
  - `flow.dispatch.accepted`
  - `flow.callback.received`
  - `audit.alert`
- [ ] chuẩn hóa live event shape:
  - `event_type`
  - `workspace_id`
  - `scope_type`
  - `scope_id`
  - `object_type`
  - `object_id`
  - `summary`
  - `severity`
  - `timestamp`
  - `trace_id`
  - `payload_minimal`
- [ ] chỉ cho phép subscribe theo workspace/user hợp lệ
- [ ] degraded mode: SSE fail vẫn dùng app được

Definition of done:

- tạo review item hoặc callback flow sẽ đẩy được event realtime
- không broadcast chéo tenant

Dependencies:

- WS1
- WS2
- WS4

---

VI.F. WS6. FLOW BRIDGE PHASE 1

Mục tiêu:

- có 1 đường dispatch thật từ CIOS sang Flow logic

Tasks:

- [ ] khóa route dispatch trong runtime chính
- [ ] request phải có:
  - source_decision_id
  - priority
  - payload
  - requested_by
  - approved_by nếu high/critical
  - trace_id
- [ ] idempotency cho dispatch
- [ ] callback verification tối thiểu
- [ ] map callback -> update flow log -> audit -> SSE
- [ ] test success/failure/duplicate dispatch

Definition of done:

- dispatch path có request, state, callback, audit, realtime

Dependencies:

- WS1
- WS4
- WS5

---

VI.G. WS7. TESTING / OBSERVABILITY / DEV BOOTSTRAP

Mục tiêu:

- dev mới vào có thể chạy local nhanh và kiểm chứng được hệ

Tasks:

- [ ] tạo `.env.example` đầy đủ nếu chưa có
- [ ] tài liệu local run chuẩn cho Phase 1
- [ ] seed data demo đủ cho vertical slice
- [ ] thêm integration tests:
  - envelope consistency
  - auth + RBAC
  - tenant isolation
  - CEE decisions
  - review lifecycle
  - flow dispatch callback
  - SSE authorization
- [ ] structured logging + trace_id propagation

Definition of done:

- clone repo và chạy local theo tài liệu trong <= 30 phút
- vertical slice test pass

Dependencies:

- WS1 -> WS6

==================================================
VII. THỨ TỰ TRIỂN KHAI BẮT BUỘC

Sprint order:

1. WS1 API Contract Hardening
2. WS2 Identity / Workspace Cleanup
3. WS3 CRM + Discovery + Governance Foundation
4. WS4 CEE-lite + Review Queue
5. WS5 Realtime Phase 1
6. WS6 Flow Bridge Phase 1
7. WS7 Testing / Observability / Dev Bootstrap

Không đảo thứ tự này.

==================================================
VIII. SPRINT PLAN ĐỀ XUẤT

Sprint 1 (5 ngày)

- WS1 hoàn tất
- WS2 phần role/permission matrix

Sprint 2 (5 ngày)

- WS2 hoàn tất
- WS3 schema + repository cleanup

Sprint 3 (5 ngày)

- WS3 route hardening
- WS4 CEE-lite core

Sprint 4 (5 ngày)

- WS4 review queue lifecycle
- WS5 SSE foundation

Sprint 5 (5 ngày)

- WS6 flow dispatch + callback
- WS5 realtime integration finish

Sprint 6 (5 ngày)

- WS7 integration tests
- dev bootstrap/docs hardening
- release gate check

Tổng thời lượng Phase 1:

- 6 sprint x 5 ngày = khoảng 6 tuần làm việc
- thực tế với buffer/fix/review: 7 đến 8 tuần

==================================================
IX. ƯỚC TÍNH NHÂN SỰ

Khuyến nghị tối thiểu:

- 1 backend lead
- 1 backend/fullstack dev
- 1 frontend/fullstack dev

Nếu chỉ có 1 dev chính:

- 8 đến 10 tuần cho bản usable

==================================================
X. ACCEPTANCE GATE CHO PHASE 1

Phase 1 chỉ được coi là xong khi tất cả điều kiện dưới đây đạt:

API / Contract

- [ ] mọi route phase 1 dùng response envelope chuẩn
- [ ] mọi lỗi có `error.code` + `request_id`

Auth / RBAC

- [ ] route nhạy cảm có 401/403 test
- [ ] tenant isolation test pass

Data Foundation

- [ ] discovery/governance/organization records có state đủ dùng
- [ ] audit log ghi được success/fail

Compliance

- [ ] CEE-lite trả được allow/deny/review_required
- [ ] review queue hoạt động thật

Realtime

- [ ] SSE hoạt động cho review/flow status

Flow

- [ ] có ít nhất 1 dispatch path + callback path thật

Quality

- [ ] test pass
- [ ] typecheck pass
- [ ] local onboarding rõ

==================================================
XI. RỦI RO CHÍNH CẦN TRÁNH

1. Build song song Fastify và Workers như hai hệ chính
2. Làm UI trước khi contract API ổn định
3. Làm workflow trước compliance gate
4. Để fallback/mock trở thành production truth
5. Thiếu tenant isolation tests
6. Thiếu audit cho denial/review_required

==================================================
XII. NEXT ACTIONS NGAY BÂY GIỜ

Sau khi file này được chấp nhận, thực hiện ngay theo thứ tự:

1. chuẩn hóa response envelope trong `src/`
2. khóa canonical error codes
3. tạo permission matrix phase 1
4. dựng CEE-lite service
5. dựng review queue schema + routes

==================================================
XIII. DEFINITION OF PHASE 1 SUCCESS

Phase 1 thành công khi repo hiện tại có thể chứng minh được:

- backend foundation đã ổn định
- compliance không còn là ghi chú tài liệu mà đã là runtime gate
- ít nhất 1 action nhạy cảm đi qua đủ: auth -> RBAC -> CEE -> review/audit -> realtime -> callback
- team có thể tiếp tục sang Phase 2 mà không phải refactor nền tảng lớn

END FILE
