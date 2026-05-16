# CIOS — App UI Master

**Dashboard thật + logic thật + Flow Connect UI + Admin System UI**

Giao thẳng cho DEV + UI/UX + Product.

**Tham chiếu:** `docs/CIOS_BUILD_ORDER_LOCK.md`, `docs/CIOS_SYSTEM_UPGRADE_FINAL_LOCK.md`, `docs/CIOS_LANDING_PAGE_MASTER.md`, `CUSTOMER_INTELLIGENCE_OS_MASTER_SPEC.md`.

---

## 1. Mục tiêu

CIOS app **không** được làm như dashboard đẹp nhưng rỗng. Nó phải là **operating surface** thật.

Người dùng mở app phải trả lời được ngay **5 câu**:

1. Hệ đang ổn hay không  
2. Vấn đề lớn nhất hiện tại là gì  
3. Rủi ro nào đang tăng nhanh  
4. Quyết định nào cần xử lý ngay  
5. Hành động nào cần dispatch sang Flow  

App phục vụ **4 vai trò:** Observer, Operator, Governor, Root.

---

## 2. Cấu trúc tổng thể

CIOS có **3 lớp giao diện** tách rõ:

| Lớp | Mục đích |
|-----|----------|
| **App UI** | Sử dụng hằng ngày |
| **Flow Connect UI** | Xem, map, dispatch, theo dõi execution giữa CIOS và Flow |
| **Admin System UI** | Cấu hình, quản trị, governance rules, data, users, sources, reports |

---

## 3. App information architecture

```text
/app
  /overview
  /entities
  /events
  /risks
  /scores
  /reports
  /simulation
  /decisions
  /governance
  /data
  /search
  /timeline
  /flow
  /settings-lite
```

---

## 4. App navigation

### 4.1 Left sidebar

- Overview  
- Entities  
- Events  
- Risks  
- Scores  
- Data Query  
- Simulation  
- Decisions  
- Governance  
- Reports  
- Timeline  
- Flow  
- Search  

### 4.2 Topbar

- Workspace name  
- Time range selector  
- Global search  
- Alerts bell  
- Quick actions  
- User menu  

### 4.3 Right utility drawer

- Selected entity detail  
- Quick insight  
- Related events  
- Related risks  
- Jump to evidence  
- Quick dispatch  
- Notes  

---

## 5. App UI — dashboard thật + logic thật

### 5.1 Overview page

**Mục tiêu:** Trang đầu = **command center**, không phải chart gallery.

**A. System Status Strip** — 6 chỉ số lõi:

- system health  
- trust index  
- stress index  
- resilience index  
- active risk count  
- data freshness  

Mỗi chỉ số: **current value**, **trend** (24h / 7d), **severity color**, **click → drilldown**.

**B. Top Problems Panel** — 3–5 vấn đề lớn nhất:

- title, severity, why it matters, impacted area, suggested next action, open full context  

→ Card **logic thật**, không card tĩnh.

**C. Active Alerts** — critical / high / medium / low:

- source, first seen, last seen, related entities, related risks, dismiss or escalate, open decision path  

**D. Decision Queue Summary** — pending approvals, recommendations ready, executed today, rejected, rollback candidates  

**E. Last Simulation Summary** — latest scenarios, impacted metrics, confidence, recommended next step  

**F. Flow Dispatch Summary** — dispatched today, success, failed, waiting callback, retry needed  

**G. Data Freshness & Ingestion Health** — healthy sources, delayed, failed jobs, stale datasets  

**Logic bắt buộc:** Overview lấy dữ liệu thật từ: system state, alerts, decisions, simulation results, flow logs, ingestion health. **Không hardcode.**

---

### 5.2 Entities page

**Mục tiêu:** Duyệt mọi đối tượng trong hệ.

**Tabs:** all entities, humans, organizations, systems, clusters, flagged  

**Bảng (mỗi hàng):** entity name, type, current status, trust score, stress score, risk count, last event, linked decisions, linked flows  

**Detail drawer:** profile summary, timeline, related entities, scores history, active risks, behavior flags, recent simulations, decisions involving entity, flow actions involving entity  

**Filter bắt buộc:** type, region, status, score range, risk level, date updated, tags  

---

### 5.3 Events page

**Mục tiêu:** Event stream thật.

**Layout:** left filters | center stream | right detail  

**Event stream card:** timestamp, title, type, source, severity, related entity, related risk, current state, open evidence  

**Detail panel:** raw event, normalized event, source lineage, downstream impact, linked alerts / simulations / decisions / flow dispatches  

**Chế độ xem:** stream, table, grouped by type / severity / source  

---

### 5.4 Risks page

**Mục tiêu:** Radar rủi ro thật.

- **Risk heatmap** — by entity, zone, category, time  
- **Risk table** — title, type, severity, confidence, affected entities, trend, predicted growth, recommended action  
- **Risk trend** — rising, stable, falling, newly detected  
- **Risk detail** — why flagged, evidence, source events, affected scores, simulation relevance, decision status, flow action status  

**Categories:** operational, financial, human, system, legal, reputation, data  

---

### 5.5 Scores page

**Mục tiêu:** Các lớp scoring của hệ.

**Score families (required):** trust, stress, resilience, stability, performance, economic, mission alignment (nếu dùng)  

**UI:** summary cards, distribution charts, entity score table, score history, calculation metadata, change reasons  

**Bắt buộc cho user:** score tính từ đâu, thay đổi vì event nào, độ tin cậy, last recalculated at  

---

### 5.6 Data Query page

**Mục tiêu:** Kho dữ liệu thông minh — **không được làm tìm kiếm yếu.**

**A. Query Builder** — dataset, entity types, date range, source, risk level, score range, status, tags, text query, **semantic query**  

**B. Smart Search** — structured mode + natural language mode  

Ví dụ: high risk entities last 24h; trust drop organizations this week; events linked to failed dispatch; simulations with low confidence  

**C. Saved Views** — save / share / pin filter, default team views  

**D. Result modes** — table, timeline, cards, graph, export preview  

**E. Data Lineage Panel** — source, transforms, quality flag, freshness, downstream usage  

**Bắt buộc:** multi-filter, nested filters, compare two time windows, query recall, evidence jump  

---

### 5.7 Reports page

**Mục tiêu:** Hiểu hệ theo giờ / ngày / tuần / tháng.

- **Report summary** — latest hourly, daily, weekly snapshot, monthly summary  
- **Auto-generated insights** — biggest change, biggest risk rise, biggest recovery, failed actions, recommended focus  
- **Report library** — past, scheduled, pinned, exported  
- **Report detail** — executive summary, metric delta, risk/decision/flow summary, data issues, suggested actions  

**Actions:** generate now, send to admin, export, mark important, convert report → decision draft  

---

### 5.8 Simulation page

**Mục tiêu:** Hệ nghĩ trước khi làm.

**Layout:** left scenario library | center builder + results | right assumptions + impact summary  

**Builder:** choose **snapshot**, entities, parameters, inject event, change policy, score weights, horizon, run  

**Results:** predicted score/risk changes, affected entities, impact graph, confidence, comparison with baseline  

**Compare:** A vs B, vs current baseline, vs historical similar run  

**Actions:** save, duplicate, promote to decision, attach governance request, export to report  

**Điều kiện bắt buộc:** Simulation chạy trên **snapshot**, không chạy trực tiếp trên live state (đồng bộ FINAL LOCK).

---

### 5.9 Decisions page

**Mục tiêu:** Recommendation → quyết định có kiểm soát.

**Views:** recommendations, drafts, pending approval, approved, rejected, executed, rolled back  

**Decision card:** title, reason, priority, expected impact, related risks/simulation, approvals needed, status, suggested flow mapping  

**Detail:** context, supporting data, evidence, simulation, cost/risk tradeoff, approval chain, execution recommendation, rollback possibility  

**Actions:** edit draft, request approval, reject, approve, send to flow, archive, rollback review  

---

### 5.10 Governance page

**Mục tiêu:** Lớp kiểm soát quyết định.

**Sections:** approval queue, recent approvals, rejections, exceptions, overrides, rollback actions, audit chain  

**Approval detail:** what requested, who, why now, evidence bundle, simulation basis, risk if approved / not approved, downstream actions, rollback path  

**Actions:** approve, reject, request more evidence, escalate, time-box approval, attach note, require multi-approval  

**Must have:** mọi governance action logged; ai duyệt gì rõ; human override visible  

---

### 5.11 Timeline page

**Mục tiêu:** Lịch sử hệ theo chuỗi.

**Tracks:** events, risks, score shifts, simulations, decisions, governance actions, flow executions, reports  

User nhìn được: thứ tự nhân quả, quyết định sinh ra, flow chạy, kết quả quay về hệ.

---

### 5.12 Search page

**Mục tiêu:** Một nơi tìm mọi thứ.

**Domains:** entities, events, risks, simulations, decisions, governance, reports, flow logs, users, data sources  

**Modes:** keyword, structured, semantic, recent, saved  

**Kết quả bắt buộc:** type badge, confidence/freshness, direct open, related records, evidence access  

---

## 6. Flow Connect UI

### 6.1 Mục tiêu

Giao diện nối CIOS ↔ **flow.iai.one**. **Không** biến thành flow builder.

Chỉ: map trigger, dispatch, monitor execution, reconcile feedback loop.

---

### 6.2 Flow page structure

```text
/flow
  /overview
  /triggers
  /dispatches
  /executions
  /callbacks
  /mappings
  /failures
```

---

### 6.3 Flow overview

- Total dispatches today, success rate, failures, average latency, waiting callbacks  
- Top flow targets, decisions sent to flow, rules auto-dispatched  
- Visual: dispatch trend, success/fail donut, latency trend, callback health  

---

### 6.4 Trigger mappings

**Table:** mapping name, source type, condition, target flow id/name, payload version, approval required, status, last used, success rate  

**Examples:** high risk financial → crisis flow; stale data > 6h → source-health flow; approved decision type X → execution flow X  

**Actions:** view, edit, disable, duplicate, test dry run  

---

### 6.5 Dispatches

**Table:** dispatch id, source object, source type, triggered by, target flow, payload version, status, callback status, created at  

**Detail:** full payload, trace id, approval/decision/simulation refs, execution logs summary, retry history  

---

### 6.6 Executions

**States:** pending, running, success, failed, cancelled, partial, timeout  

**Detail:** execution id, target flow, status, started/finished, latency, output summary, side effects, **events back into CIOS**  

**Actions:** retry, escalate, create incident, attach to decision review  

---

### 6.7 Callbacks

**Khóa vòng phản hồi:** callback queue, missing/invalid/reconciled callbacks, callback lag  

Mọi flow result quay về CIOS thành: execution result, state update, new event, possible risk adjustment, outcome cho learning loop  

---

### 6.8 Failures

**Views:** recent, repeated, high impact, no callback, payload validation failures  

**Actions:** retry, disable mapping, escalate to governance, generate report item, open source decision  

---

## 7. Admin System UI

### 7.1 Mục tiêu

Cấu hình hệ — **không** cho user hằng ngày. Đủ để: vận hành, giám sát, cấu hình, bảo vệ, kiểm toán.

---

### 7.2 Admin routes

```text
/admin
  /dashboard
  /users
  /roles
  /permissions
  /sources
  /ingestion
  /warehouse
  /rules
  /scores
  /risk-models
  /simulation-config
  /decision-config
  /governance-config
  /reports-config
  /flow-config
  /audit
  /security
  /system-health
  /feature-flags
```

---

### 7.3 Admin dashboard

User count, active sessions, source health, ingestion jobs, queue health, failed reports, failed flow callbacks, system incidents, security anomalies  

---

### 7.4 Users / roles / permissions

**Users:** list, status, role, last active, workspace access, risk flags  

**Roles:** Observer, Operator, Governor, Root (+ custom nếu cần)  

**Permissions matrix:** read, write, approve, dispatch, configure, export, rollback, admin override  

**Actions:** assign role, revoke, suspend, force reset, view audit history  

---

### 7.5 Sources / ingestion

**Sources:** name, type, auth status, freshness, last successful sync, error count, owner, importance tier  

**Ingestion jobs:** name, schedule, duration, status, rows processed/failed, retry count, output dataset  

**Actions:** run now, pause, retry, disable, inspect errors  

---

### 7.6 Warehouse

**Views:** raw, normalized, enriched, aggregated, **semantic views**, index status, vector index status, **lineage explorer**  

**Actions:** refresh, rebuild index, flag stale, archive, inspect lineage  

---

### 7.7 Rules / scores / risk models

**Rules:** decision, alert, routing, auto-escalation  

**Scores config:** families, weights, formulas, dependencies, thresholds  

**Risk models:** categories, severity thresholds, confidence, trend window, escalation conditions  

**Must have:** versioning, change history, rollback  

---

### 7.8 Simulation config

Available models, parameter sets, **snapshot policies**, compare logic, confidence logic, scenario templates  

**Actions:** enable model, default assumptions, freeze config version, audit change  

---

### 7.9 Decision config

Decision types, priority matrix, required evidence/simulation rules, auto-create draft conditions, auto-send to governance conditions  

---

### 7.10 Governance config

Approval policies, quorum, weighted approval, override rules, rollback policies, sensitive action classes  

**Must have:** matrix theo decision type, time-limited approvals, emergency path, human override path  

---

### 7.11 Reports config

Templates, schedules, delivery targets, AI summary settings, audience rules, escalation report rules  

**Actions:** create schedule, preview template, send test, disable, mark executive report  

---

### 7.12 Flow config

Flow endpoint settings, mapping registry, callback config, payload schema versions, retry policy, dead letter logic, reconciliation rules  

---

### 7.13 Audit

**Filters:** user, role, object type, action, date, severity  

**Detail:** who, what, when, before, after, source, trace id, related approval/dispatch  

---

### 7.14 Security

Active sessions, suspicious access, failed auth, permission anomalies, admin changes, export logs, IP/device patterns  

**Actions:** kill session, suspend user, require re-auth, mark incident, escalate to root  

---

### 7.15 System health

API, DB, queues, workers, ingest pipeline, report jobs, flow callbacks, stale indexes, failed simulations  

---

### 7.16 Feature flags

Rollout dần: simulation compare, AI summary, semantic search, auto draft decisions, flow auto dispatch, enterprise governance, …  

---

## 8. Cross-UI states bắt buộc

Mọi trang (app, flow, admin): **loading**, **empty**, **no permission**, **stale data**, **partial data**, **error**, **retry**, **maintenance**. Không blank screen.

---

## 9. Quick actions toàn hệ

Từ topbar hoặc command palette:

- open entity, search event, run simulation, create decision draft, request approval, dispatch flow, generate report, view audit trail, open failed execution, jump to lineage  

---

## 10. Command palette

Kiểu OS: *find entity Acme*, *show high risks*, *run quick simulation*, *open today report*, *view failed dispatches*, *create governance request*, *go to source health*  

Tăng tốc độ vận hành — **đáng ưu tiên** sau lõi.

---

## 11. Mobile / responsive priority

**Desktop-first** nhưng mobile **usable**.

**Mobile bắt buộc:** overview, alerts, top problems, decision approvals, flow failures, quick reports  

**Không bắt buộc full mobile:** simulation studio full, data query full builder, admin config sâu  

---

## 12. Thiết kế hiển thị

- Dark-first, clean grid, strong hierarchy  
- Cards + tables + drawer + timeline  
- Alert colors rõ nhưng tiết chế — không loè loẹt, không quá nhiều chart  

**Ưu tiên:** clarity, actionability, auditability, drilldown speed  

---

## 13. Dòng logic người dùng

| Vai trò | Luồng chính |
|---------|-------------|
| **Observer** | Overview → Risks → Reports → Timeline |
| **Operator** | Overview → Events → Data Query → Simulation → Dispatch |
| **Governor** | Overview → Decisions → Governance → Audit → Reports |
| **Root** | Admin Dashboard → Security → System Health → Governance Config → Audit |

---

## 14. Logic thật nối giữa màn hình

Mọi object **click xuyên hệ** được.

Ví dụ chuỗi: risk → entity → events → lineage → simulation → decision → governance → dispatch → execution → callback event → system state  

**Nếu không làm được chuỗi này, app chưa đạt mức OS.**

---

## 15. Chuỗi giá trị trong UI (backbone)

App thể hiện rõ:

```text
Data → Event → Risk → Simulation → Decision → Governance → Flow → Callback → State Update
```

---

## 16. Message chốt gửi DEV

Build CIOS as an **operating interface**, not a dashboard shell. The app UI must show **real** system state, top problems, active risks, simulation results, decision queues, and governance actions on **real data**. The Flow Connect UI must **map, dispatch, monitor, and reconcile** all CIOS-to-Flow actions **without** becoming a flow builder. The Admin System UI must control users, sources, warehouse, rules, scoring, governance, flow configuration, audit, and security. Every major object must be **traceable** across data, event, risk, simulation, decision, governance, execution, and callback. **If the UI cannot follow that chain, the system is not complete.**

---

## 17. Ưu tiên implement cho DEV

| Ưu tiên | Nội dung |
|---------|----------|
| **1** | overview, events, risks, decisions, governance, flow overview, admin dashboard |
| **2** | entities, scores, data query, reports, dispatches, callbacks, sources, ingestion |
| **3** | simulation studio, search, warehouse lineage, config modules, feature flags, command palette |

---

## 18. Kết luận

Bộ UI đúng cho CIOS không phải “nhiều màn hình” — là **hệ điều hành** có khả năng:

- nhìn trạng thái thật  
- lần ra nguồn gốc  
- nghĩ trước khi làm  
- kiểm soát quyết định  
- điều phối execution  
- học từ kết quả quay về  

Đó là app đúng cho **cios.iai.one**.

**Bước tiếp theo (đúng “FULL MENU”):** `docs/CIOS_APP_UI_FULL_MENU.md` (tên từng card/bảng/action chuẩn để DEV khỏi tự đặt tên).

---

*Tài liệu UI Master bổ sung chi tiết cho mục “Build App UI” trong BUILD ORDER; không thay đổi thứ tự triển khai.*
