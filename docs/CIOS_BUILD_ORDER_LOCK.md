# CIOS — BUILD ORDER LOCK

**Bổ sung bắt buộc (FINAL LOCK, logic IAI):** xem `docs/CIOS_SYSTEM_UPGRADE_FINAL_LOCK.md` — event bus/streaming, warehouse semantic + lineage, simulation trên snapshot, governance gắn decision lifecycle, feedback loop Flow → CIOS. Thứ tự 5 bước bên dưới **không đổi**; phạm vi từng bước phải đủ theo file đó để không build thành “dashboard” thay vì OS.

---

Phạm vi khóa chính thức cho DEV.

CIOS phải được xây như một Civilization Intelligence Operating System, không phải landing page, không phải dashboard BI, không phải CRM, không phải analytics panel thông thường.

Thứ tự triển khai bị khóa như sau và không được đảo:

1. Build Database Schema SQL
2. Build API bằng Workers
3. Build App UI
4. Build Simulation Engine Basic
5. Connect Flow

Lý do khóa theo thứ tự này:

- Không khóa dữ liệu trước thì API lệch.
- Không khóa API trước thì UI thành mock.
- Không có UI thật thì simulation không có chỗ vận hành.
- Không có simulation thì kết nối Flow chỉ còn trigger mù.

---

## 1) BUILD DATABASE SCHEMA SQL

### 1.1 Mục tiêu

Dựng bộ xương dữ liệu chuẩn cho toàn hệ. Toàn bộ UI, API, simulation, governance, reporting và automation phải bám vào schema này.

### 1.2 Nguyên tắc dữ liệu bắt buộc

- Dữ liệu là trung tâm của hệ.
- Event là đơn vị sự thật.
- Mọi thứ phải truy vết được theo thời gian.
- Mọi thay đổi quan trọng phải versioned hoặc audit được.
- Mọi bảng quan trọng phải có nguồn, trạng thái, thời gian tạo, thời gian cập nhật.
- Mọi object trọng yếu phải liên kết được với entity, event, decision, risk, simulation, governance.

### 1.3 Cấu trúc schema cấp cao bắt buộc

Schema phải chia nhóm logic rõ ràng:

- Entity layer
- Human layer
- Organization layer
- System state layer
- Event layer
- Ingestion layer
- Warehouse layer
- Scoring layer
- Risk layer
- Behavior layer
- Simulation layer
- Decision layer
- Governance layer
- Policy layer
- Reporting layer
- Flow integration layer
- Search and index layer
- Security and access layer
- Audit and rollback layer
- AI layer
- Scheduler and automation layer

### 1.4 Bảng lõi bắt buộc ngay từ phase đầu

- entities
- entity_types
- entity_relationships
- humans
- organizations
- systems
- system_states
- events
- event_types
- event_sources
- risks
- risk_signals
- scores
- score_types
- behaviors
- simulations
- simulation_scenarios
- decisions
- governance_requests
- governance_approvals
- policies
- reports
- report_jobs
- data_sources
- data_jobs
- warehouse_raw
- warehouse_normalized
- warehouse_aggregated
- flow_triggers
- flow_logs
- users
- roles
- permissions
- access_logs
- audit_logs

### 1.5 Quy tắc thiết kế bảng

Mỗi bảng phải có tối thiểu:

- id
- public_id (nếu cần expose)
- status
- created_at
- updated_at
- created_by (nếu do người thao tác)
- source_id (nếu có nguồn dữ liệu)
- version (nếu cần versioning)
- metadata_json (nếu cần mở rộng có kiểm soát)

### 1.6 Quy tắc khóa ngoại và quan hệ

- Không được để model phẳng.
- Một entity liên quan nhiều event.
- Một event có thể sinh nhiều risk signal.
- Một simulation phải gắn input state và output result.
- Một decision phải tham chiếu simulation hoặc evidence.
- Một governance request tham chiếu decision hoặc policy change.
- Một flow trigger truy ngược decision hoặc rule kích hoạt.

### 1.7 Queryability bắt buộc

Schema phải query được theo:

- thời gian
- entity
- khu vực
- loại risk
- loại event
- mức trust
- mức stress
- nguồn dữ liệu
- kết quả simulation
- trạng thái governance
- lịch sử flow đã kích hoạt

### 1.8 Đầu ra bắt buộc của phase này

- Sơ đồ dữ liệu tổng thể
- Danh sách bảng hoàn chỉnh
- Quan hệ giữa các bảng
- Quy tắc đặt tên chuẩn
- Migration strategy
- Seed strategy tối thiểu
- Danh sách index cần tạo
- Phân loại immutable/mutable/snapshot/aggregation

---

## 2) BUILD API BẰNG WORKERS

### 2.1 Mục tiêu

Build API thật bằng Cloudflare Workers trên dữ liệu thật. UI không được đi tắt vào data layer.

### 2.2 Triết lý API

API của CIOS không phải REST CRUD đơn giản. Đây là interface vận hành của một operating system.

API phải hỗ trợ:

- đọc trạng thái hệ
- ghi event và cập nhật trạng thái
- kích hoạt intelligence, simulation, governance, reporting

### 2.3 Nhóm API bắt buộc

Nhóm hệ thống:

- /v1/system/state
- /v1/system/metrics
- /v1/system/snapshots
- /v1/system/health

Nhóm entity:

- /v1/entities
- /v1/entities/:id
- /v1/entities/:id/relations
- /v1/entities/:id/events
- /v1/entities/:id/scores

Nhóm event:

- /v1/events
- /v1/events/ingest
- /v1/events/types
- /v1/events/search

Nhóm risk:

- /v1/risks
- /v1/risks/signals
- /v1/risks/summary
- /v1/risks/alerts

Nhóm scoring:

- /v1/scores
- /v1/scores/types
- /v1/scores/recalculate

Nhóm warehouse/query:

- /v1/data/sources
- /v1/data/jobs
- /v1/data/query
- /v1/data/search
- /v1/data/filters

Nhóm simulation:

- /v1/simulations
- /v1/simulations/run
- /v1/simulations/compare
- /v1/simulations/:id

Nhóm decision:

- /v1/decisions
- /v1/decisions/recommendations
- /v1/decisions/:id

Nhóm governance:

- /v1/governance/requests
- /v1/governance/approvals
- /v1/governance/audit
- /v1/governance/rollback

Nhóm reporting:

- /v1/reports
- /v1/reports/jobs
- /v1/reports/daily
- /v1/reports/hourly

Nhóm flow integration:

- /v1/flow/triggers
- /v1/flow/dispatch
- /v1/flow/logs

### 2.4 Hành vi API bắt buộc

- pagination
- filtering
- sorting
- time range
- role-based access
- structured error format
- request validation
- rate limiting route nhạy cảm
- audit cho action quan trọng
- idempotency cho route ingest/trigger phù hợp

### 2.5 Security layer bắt buộc

- authentication
- authorization
- role mapping
- input validation
- logging
- access logs
- admin-only routes
- governance-protected routes
- signature check cho ingest nguồn ngoài

### 2.6 Quy tắc response

Mọi route phải thống nhất:

- ok
- data
- meta
- error
- trace_id

### 2.7 Đầu ra bắt buộc của phase này

- API map đầy đủ
- Danh sách route
- Request schema
- Response schema
- Permission matrix theo role
- Error contract
- Audit scope
- Danh sách route realtime hoặc polling
- Danh sách route nối trực tiếp reporting/simulation/flow

---

## 3) BUILD APP UI

**Spec UI đầy đủ (app + Flow Connect + Admin):** `docs/CIOS_APP_UI_MASTER.md`.

### 3.1 Mục tiêu

Chỉ build UI thật sau khi schema + API đã khóa. UI là lớp vận hành hệ thống, không phải trang trình diễn.

User types:

- Observer
- Operator
- Governor
- Root

### 3.2 Cấu trúc UI tổng thể

- Public web
- App vận hành chính
- Admin and governance console

Trọng tâm phase này: app vận hành chính.

### 3.3 Màn hình bắt buộc

- System Overview
- Entity Explorer
- Event Center
- Risk Console
- Smart Data Query
- Reports Center
- Decisions Queue
- Governance Console
- Simulation Studio

### 3.4 Nguyên tắc UX bắt buộc

UI phải ưu tiên:

- tính hệ thống
- đọc nhanh
- lọc nhanh
- truy dấu nhanh
- không rối
- không giả dashboard enterprise cũ
- không chỉ biểu đồ đẹp mà thiếu hành động

### 3.5 Yêu cầu Smart Data UI

- global search
- advanced filter builder
- saved filter sets
- multi-dimensional query
- time slicing
- compare two windows
- entity drilldown
- evidence jump links
- data lineage preview
- data freshness badge
- data confidence badge

### 3.6 Đầu ra bắt buộc của phase này

- Information architecture
- Sitemap app
- Danh sách trang/module UI
- Navigation rules
- Role-based view matrix
- Loading/empty/error/stale handling
- Widget data truth map (real vs derived)
- Tách rõ chỗ xem/chỗ thao tác/chỗ phê duyệt

---

## 4) BUILD SIMULATION ENGINE BASIC

### 4.1 Mục tiêu

CIOS phải có khả năng nghĩ trước khi làm:

- nhận trạng thái hiện tại
- nhận biến đầu vào
- chạy mô phỏng
- trả outcome dự đoán
- ước lượng rủi ro
- so sánh kịch bản cơ bản

### 4.2 Bản basic phải mô phỏng được

- thay đổi rule/policy
- thay đổi một chỉ số hệ thống
- event bất thường xuất hiện
- tăng/giảm resource
- tăng stress hoặc giảm trust
- cụm entity thay đổi hành vi

### 4.3 Cách hiểu đúng về bản basic

Không cần AI phức tạp ngay, nhưng phải chạy thật + lưu thật.

Khởi đầu được chấp nhận:

- rule-based simulation
- weighted scoring impact
- simple probability model
- scenario comparison
- replay saved scenario

### 4.4 Input bắt buộc

- current system state
- selected entities
- selected metrics
- parameter overrides
- policy change assumptions
- risk assumptions
- time horizon

### 4.5 Output bắt buộc

- predicted score changes
- predicted risk changes
- affected entities
- impact zones
- confidence estimate
- recommended next view
- whether governance review is required
- whether flow dispatch is recommended

### 4.6 Yêu cầu lưu vết

Mỗi simulation run phải lưu:

- ai chạy
- chạy lúc nào
- input
- base state
- logic đã dùng
- output
- confidence
- liên kết decision (nếu có)

### 4.7 Màn hình simulation bắt buộc

- create scenario
- edit scenario
- run scenario
- compare two scenarios
- save scenario
- open result
- promote result to decision review

### 4.8 Đầu ra bắt buộc của phase này

- Simulation data flow
- Scenario object structure
- Input/output parameter lists
- Rule engine basic spec
- Confidence logic basic
- Scenario compare logic
- Simulation history model
- Mapping UI -> simulation
- Mapping decision engine -> simulation results

---

## 5) CONNECT FLOW

### 5.1 Mục tiêu

CIOS không thực thi automation lớn. CIOS phân tích/đề xuất/phê duyệt (nếu cần) rồi dispatch sang `flow.iai.one`.

CIOS = brain.
Flow = execution hands.

### 5.2 Nguyên tắc kết nối

- Không build trùng logic automation giữa hai hệ.
- Không để CIOS thành flow builder mới.
- Không để Flow thay simulation/governance của CIOS.

Phân vai cứng:

CIOS:

- quan sát
- phân tích
- chấm điểm
- mô phỏng
- đề xuất
- xếp ưu tiên
- kiểm soát phê duyệt

Flow:

- nhận trigger/input
- chạy automation
- trả log/status/output

### 5.3 Trường hợp CIOS gọi Flow

- risk vượt ngưỡng
- anomaly cluster xuất hiện
- decision đã được phê duyệt
- policy change cần triển khai
- report kích hoạt workflow gửi nhiều nơi
- ingest job lỗi cần workflow xử lý
- incident cần escalation

### 5.4 Mapping bắt buộc giữa CIOS và Flow

- trigger name
- trigger source
- payload structure
- priority
- idempotency
- expected callback
- execution status mapping
- retry policy
- failure handling
- audit linkage
- who approved action

### 5.5 Cơ chế dispatch chuẩn

Mỗi dispatch phải gắn được:

- source decision/rule
- source simulation (nếu có)
- requested_by
- approved_by (nếu cần)
- payload version
- flow target id
- expected outcome
- trace_id
- rollback reference (nếu nhạy cảm)

### 5.6 Màn hình UI liên quan Flow

- dispatch history
- linked flow logs
- execution outcome
- failed dispatch list
- retry control
- escalation status

### 5.7 Đầu ra bắt buộc của phase này

- Flow integration map
- Use case list gọi Flow
- Trigger/payload/callback contracts
- Execution/failure mapping
- Audit mapping
- Dispatch permission model
- UI flow linkage locations

---

## KHOA PHAM VI CHO DEV

Đây là trình tự triển khai chính thức, không phải gợi ý.

- Không làm UI trước schema.
- Không làm simulation trước API thật.
- Không nối Flow trước khi có decision context.
- Không để report chỉ là biểu đồ.
- Không để warehouse chỉ lưu thô mà không query được.

Kết quả cuối sau 5 bước phải tạo ra hệ CIOS có thể:

- lưu trữ dữ liệu đúng cấu trúc
- đọc/truy vấn dữ liệu thật
- hiển thị trạng thái hệ rõ ràng
- lọc dữ liệu rất sâu cho admin
- mô phỏng kịch bản cơ bản
- tạo đề xuất có căn cứ
- điều phối hành động sang Flow
- giữ được audit + governance foundation

---

## MESSAGE NGAN GUI DEV

CIOS build order is locked as follows: First build the database schema and entity-event-risk-decision-governance foundations. Then build Cloudflare Workers APIs on top of the real schema. Only after the APIs are stable should the app UI be built on real data. Next, implement the basic simulation engine so the system can test scenarios before acting. Finally, connect CIOS to flow.iai.one strictly as the intelligence-to-execution bridge. Do not reverse this order. Do not treat CIOS as a dashboard, BI tool, or simple admin panel. It must operate as a Civilization Intelligence Operating System with queryable data, state awareness, scenario testing, governance traceability, and execution handoff to Flow.
