# CIOS — App UI Full Menu (Card/Table/Action)

**Mục tiêu:** DEV có thể implement UI/UX và wiring logic **không phải tự đặt tên**.

**Tham chiếu:** `docs/CIOS_APP_UI_MASTER.md`, `docs/CIOS_SYSTEM_UPGRADE_FINAL_LOCK.md`, `docs/CIOS_BUILD_ORDER_LOCK.md`.

---

## 0. Nguyên tắc đặt tên (bắt buộc)

1. Mọi action button phải có label cố định (exact string).
2. Mọi row/card click phải có đường dẫn drilldown và action tương ứng (không click mơ hồ).
3. Mọi “open” đều phải mở đúng context liên kết (entity/event/risk/simulation/decision/governance/dispatch/callback).
4. Không hardcode dữ liệu demo trong màn chính; nếu demo-mode dùng mock thì phải có badge `DEMO MODE` và vẫn giữ contract UI.

---

## 1. Danh sách action button chuẩn (được dùng xuyên suốt)

Primary / Connect

- `Run Analysis`
- `See My Business Now`
- `Dispatch to Flow`
- `Request Approval`
- `Create Decision Draft`
- `Approve`
- `Reject`
- `Retry Execution`
- `Escalate to Governance`
- `Generate Report Now`
- `Open Full Context`
- `View Lineage`
- `Jump to Evidence`
- `Open Simulation Result`
- `Promote to Decision`
- `Attach to Governance Request`
- `Export`

Secondary / Navigation

- `Dismiss`
- `Disable Mapping`
- `Edit Mapping`
- `View Mapping`
- `Duplicate`
- `Save Scenario`
- `Duplicate Scenario`
- `Compare Scenarios`
- `Open Details`
- `Back`
- `Retry Job`
- `Inspect Errors`

Audit / Control

- `View Audit Trail`
- `Rollback Review`
- `Request More Evidence`
- `Time-box Approval`
- `Require Multi-approval`

Status / UX states (label hiển thị)

- `Loading`
- `No Data`
- `No Permission`
- `Stale Data`
- `Partial Data`
- `Error`
- `Retry`
- `Maintenance`

---

## 2. App UI — menu đầy đủ

### 2.1 Route: `/app/overview`

**Components / Card set (trình tự hiển thị):**

1. `System Status Strip`
2. `Top Problems Panel`
3. `Active Alerts`
4. `Decision Queue Summary`
5. `Last Simulation Summary`
6. `Flow Dispatch Summary`
7. `Data Freshness & Ingestion Health`

**A) System Status Strip**

6 chỉ số (mỗi chỉ số có drill action):

- `System Health`
  - Button: `Open Details`
  - Drilldown route: `/app/search?type=system_state&context=health`
- `Trust Index`
  - Button: `Open Details`
  - Drilldown route: `/app/search?type=score&family=trust`
- `Stress Index`
  - Button: `Open Details`
  - Drilldown route: `/app/search?type=score&family=stress`
- `Resilience Index`
  - Button: `Open Details`
  - Drilldown route: `/app/search?type=score&family=resilience`
- `Active Risk Count`
  - Button: `Open Details`
  - Drilldown route: `/app/risks`
- `Data Freshness`
  - Button: `Open Details`
  - Drilldown route: `/app/data`

**B) Top Problems Panel**

- N card = `3–5`
- Mỗi card có action:
  - Button: `Open Full Context`
  - Drill chain mặc định: `risk → entity → events → lineage`

**C) Active Alerts**

Section theo mức:

- `Critical`
- `High`
- `Medium`
- `Low`

Alert row actions (trên mỗi dòng):

- `Dismiss`
- `Escalate to Governance` (nếu thuộc quyền Operator/Governor)
- `Open Decision Path` (nếu có decision mapping)
- `Jump to Evidence`

Row click behavior:

- Click card/row mở `Alert Detail Drawer` (right utility drawer)

**D) Decision Queue Summary**

Các mini-card (click-drill):

- `Pending Approvals` → `/app/governance`
- `Recommendations Ready` → `/app/decisions?view=recommendations`
- `Executed Today` → `/app/decisions?view=executed&range=today`
- `Rejected` → `/app/decisions?view=rejected`
- `Rollback Candidates` → `/app/governance?view=rollback_candidates`

**E) Last Simulation Summary**

- Card click: `Open Simulation Result`
- Primary link tới scenario run detail (nếu tồn tại): `/app/simulation?tab=results&runId=...`

**F) Flow Dispatch Summary**

Metrics card click:

- `Waiting callbacks` → `/flow/callbacks`
- `Failed` → `/flow/failures`
- `Retry needed` → `/flow/failures?filter=retry_needed`

Row actions:

- `Open Details` (dispatch detail)
- `Jump to Evidence` (trace + related events)

**G) Data Freshness & Ingestion Health**

Hiển thị theo nhóm:

- `Healthy Sources`
- `Delayed Sources`
- `Failed Jobs`
- `Stale Datasets`

Source/job row actions:

- `Retry Job`
- `Inspect Errors`
- `View Lineage`

---

### 2.2 Route: `/app/entities`

**Tabs**

- `All Entities`
- `Humans`
- `Organizations`
- `Systems`
- `Clusters`
- `Flagged`

**Entity table**

Columns:

- `Entity Name`
- `Type`
- `Current Status`
- `Trust Score`
- `Stress Score`
- `Risk Count`
- `Last Event`
- `Linked Decisions`
- `Linked Flows`

Row click:

- mở `Entity Detail Drawer` (right)

Row quick actions (trên mỗi hàng):

- `Open Details`
- `View Audit Trail` (nếu có)
- `Jump to Evidence` (last event)

**Filter panel (bắt buộc field set)**

- `Type`
- `Region`
- `Status`
- `Score Range (Trust)`
- `Score Range (Stress)`
- `Risk Level`
- `Date Updated`
- `Tags`

**Entity Detail Drawer**

Sections:

- `Profile Summary`
  - action: `Open Details` → `/app/entities?entityId=...`
- `Timeline`
  - action: `Open Details` → `/app/timeline?entityId=...`
- `Related Entities`
  - action: `Open Details` on selected entity row
- `Scores History`
  - action: `Open Details` → `/app/scores?entityId=...`
- `Active Risks`
  - action: `Open Details` → `/app/risks?entityId=...`
- `Behavior Flags`
  - action: `Jump to Evidence`
- `Recent Simulations`
  - action: `Open Simulation Result`
- `Decisions involving entity`
  - action: `Open Details` → `/app/decisions?entityId=...`
- `Flow actions involving entity`
  - action: `Open Details` → `/flow/executions?entityId=...`

---

### 2.3 Route: `/app/events`

**Layout**

- Left: filters
- Center: event stream card
- Right: event detail panel/drawer

**Event filters**

- `Date Range`
- `Event Type`
- `Source`
- `Severity`
- `Entity`
- `Risk`
- `State`
- `Group Mode (Stream/Table)`

**Event stream card**

Row columns:

- `Timestamp`
- `Event Title`
- `Event Type`
- `Source`
- `Severity`
- `Related Entity`
- `Related Risk`
- `Current State`
- `Open Evidence` (button)

Center card view modes (UI toggle):

- `Stream View`
- `Table View`
- `Grouped by Type`
- `Grouped by Severity`
- `Grouped by Source`

Event row actions:

- `Jump to Evidence`
- `Open Details`

**Event detail panel**

Sections:

- `Raw Event`
  - action: `Jump to Evidence` (if supported)
- `Normalized Event`
- `Source Lineage`
  - action: `View Lineage`
- `Downstream Impact`
  - action: `Open Details` (open impacted entities/risks)
- `Linked Alerts`
  - action: `Open Details` → `/app/overview` or `/app/governance`
- `Linked Simulations`
  - action: `Open Simulation Result`
- `Linked Decisions`
  - action: `Open Details` → `/app/decisions`
- `Linked Flow Dispatches`
  - action: `Open Details` → `/flow/dispatches`

---

### 2.4 Route: `/app/risks`

**Risk Heatmap**

Modes:

- `By Entity`
- `By Zone`
- `By Category`
- `By Time`

Click behavior:

- Click cell opens `Risk Detail Drawer` with context

**Risk table**

Columns:

- `Risk Title`
- `Type`
- `Severity`
- `Confidence`
- `Affected Entities`
- `Trend`
- `Predicted Growth`
- `Recommended Action`

Row actions:

- `Open Details` → `/app/risks?riskId=...`
- `Open Full Context`
- `Promote to Decision` (nếu có action mapping và policy cho phép)

**Risk detail drawer**

Sections:

- `Why Flagged` (with severity explanation)
  - action: `Jump to Evidence`
- `Supporting Evidence`
  - action: `Jump to Evidence`
- `Source Events`
  - action: `Open Details` → `/app/events?riskId=...`
- `Affected Scores`
  - action: `Open Details` → `/app/scores?riskId=...`
- `Simulation Relevance`
  - action: `Open Simulation Result`
- `Decision Status`
  - action: `Open Details` → `/app/decisions`
- `Flow Action Status`
  - action: `Open Details` → `/flow/executions`

---

### 2.5 Route: `/app/scores`

**Score summary cards**

Families (required):

- `Trust`
- `Stress`
- `Resilience`
- `Stability`
- `Performance`
- `Economic`
- `Mission Alignment` (if used)

Each card actions:

- `Open Details` → `/app/scores?family=...`

**Distribution charts**

Actions:

- `Open Details` (opens distribution explanation + entity drill)

**Entity score table**

Columns:

- `Entity Name`
- `Family`
- `Score Value`
- `Confidence`
- `Last Recalculated At`
- `Change Reasons`

Row actions:

- `Open Details` (entity drill)
- `Jump to Evidence` (the event causing change)

**Score history**

- action: `Open Details` for each historical point’s evidence

**Score calculation metadata**

- action: `View Lineage`

---

### 2.6 Route: `/app/data` (Data Query)

**Query Builder**

Fields (bắt buộc):

- `Dataset`
- `Entity Types`
- `Date Range`
- `Source`
- `Risk Level`
- `Score Range`
- `Status`
- `Tags`
- `Text Query`
- `Semantic Query`

Actions:

- `Run Query` (internal primary)
- `Save View`
- `Share View`
- `Pin View`
- `Compare Time Windows`

**Smart Search**

Modes:

- `Structured Mode`
- `Natural Language Mode`

Actions:

- `Run Query`
- `Open Evidence` (per result)

**Saved Views**

Items actions:

- `Run Query`
- `Share View`
- `Pin View`
- `Delete View`

**Result Modes**

- `Table`
- `Timeline`
- `Cards`
- `Graph`
- `Export Preview`

Result panel actions:

- `Export`
- `View Lineage` (per dataset or per row)

**Data Lineage Panel (bắt buộc)**

Displays:

- `Source`
- `Transforms`
- `Quality Flag`
- `Freshness`
- `Downstream Usage`

Actions:

- `View Lineage`
- `Jump to Evidence`

---

### 2.7 Route: `/app/reports`

**Report Summary sections**

- `Latest Hourly Report`
  - action: `Open Details`
- `Daily Report`
  - action: `Open Details`
- `Weekly Snapshot`
  - action: `Open Details`
- `Monthly Summary`
  - action: `Open Details`

**Auto-generated Insights**

Cards:

- `Biggest Change`
- `Biggest Risk Rise`
- `Biggest Recovery`
- `Failed Actions`
- `Recommended Focus`

Each card action:

- `Open Full Context` → `/app/reports?reportId=...` hoặc `/app/decisions` nếu convert được

**Report Library**

Filters:

- `Past Reports`
- `Scheduled Reports`
- `Pinned Reports`
- `Exported Reports`

Row actions:

- `Open Details`
- `Generate Report Now`
- `Send to Admin`
- `Export`
- `Mark Important`
- `Convert report to decision draft` (button label: `Promote to Decision`)

**Report Detail**

Sections:

- `Executive Summary`
- `Metric Delta`
- `Risk Summary`
- `Decisions Summary`
- `Flow Summary`
- `Data Issues`
- `Suggested Actions`

Actions:

- `Export`
- `Promote to Decision`

---

### 2.8 Route: `/app/simulation`

**Main layout**

- Left: `Scenario Library`
- Center: `Scenario Builder + Results`
- Right: `Assumptions + Impact Summary`

**Scenario Library**

List actions:

- `Open Simulation Result`
- `Duplicate Scenario` (`Duplicate`)
- `Save Scenario`
- `Delete Scenario` (admin/operator if permitted)

**Scenario Builder (blocks)**

Blocks + fields:

- `Choose Snapshot` → dropdown + `Select Snapshot`
- `Choose Entities` → multi-select + chips
- `Change Parameters` → sliders/inputs
- `Inject Event` → event picker + `Inject`
- `Change Policy` → policy picker
- `Change Score Weights` → weight editor
- `Define Horizon` → time horizon
- `Run Simulation` → button `Run Simulation`

Actions:

- `Save Scenario`
- `Duplicate Scenario`
- `Run Simulation`

**Results**

Panels:

- `Predicted Score Changes`
  - action: `Open Full Context` (drill to impacted metrics + lineage)
- `Predicted Risk Changes`
  - action: `Open Details` → `/app/risks`
- `Affected Entities`
  - action: `Open Details` → `/app/entities`
- `Impact Graph`
- `Confidence Level`
- `Comparison with Baseline`

Results toolbar actions:

- `Compare Scenarios` (requires A/B selection)
- `Promote to Decision`
- `Attach to Governance Request`
- `Export`

**Scenario compare**

Actions:

- `Compare Scenarios`
- `Open Simulation Result` (for each scenario)

**Điều kiện bắt buộc (UI constraint):**

Nút `Run Simulation` disabled nếu `snapshot` chưa chọn.

---

### 2.9 Route: `/app/decisions`

**Views toggle**

- `Recommendations`
- `Drafts`
- `Pending Approval`
- `Approved`
- `Rejected`
- `Executed`
- `Rolled Back`

**Decision card**

Fields:

- `Title`
- `Reason`
- `Priority`
- `Expected Impact`
- `Related Risks`
- `Related Simulation`
- `Approvals Needed`
- `Status`
- `Suggested Flow Mapping`

Card actions:

- `Open Details`
- `Create Decision Draft` (if recommendation)
- `Request Approval`
- `Approve`
- `Reject`
- `Send to Flow` (label: `Dispatch to Flow`)
- `Archive` (button: `Archive` but if you want strict string, use `Archive`)
- `Rollback Review`

**Detail page**

Sections:

- `Context`
- `Supporting Data`
- `Linked Evidence`
- `Linked Simulation`
- `Cost/Risk Trade-off`
- `Approval Chain`
- `Execution Recommendation`
- `Rollback Possibility`

Detail actions:

- `Request Approval`
- `Approve`
- `Reject`
- `Dispatch to Flow`
- `Rollback Review`
- `View Audit Trail`

---

### 2.10 Route: `/app/governance`

**Views**

- `Approval Queue`
- `Recent Approvals`
- `Rejections`
- `Exceptions`
- `Overrides`
- `Rollback Actions`
- `Audit Chain`

**Approval detail**

Fields:

- `What is requested`
- `Who requested`
- `Why now`
- `Evidence bundle`
- `Simulation basis`
- `Risk if approved`
- `Risk if not approved`
- `Downstream actions`
- `Rollback path`

Actions:

- `Approve`
- `Reject`
- `Request More Evidence`
- `Escalate to Governance`
- `Time-box Approval`
- `Require Multi-approval`

**Must have UI controls**

- Show `human override used` flag if present
- Always show `audit chain` link with `View Audit Trail`

---

### 2.11 Route: `/app/timeline`

**Tracks**

- `Events`
- `Risk Shifts`
- `Score Shifts`
- `Simulations`
- `Decisions`
- `Governance Actions`
- `Flow Executions`
- `Reports`

Filters:

- `Time Range`
- `Entity`
- `Risk`
- `Decision Type`
- `Flow Target`

Timeline event actions:

- `Open Details` (object-specific)
- `Jump to Evidence`

---

### 2.12 Route: `/app/search`

**Search domains**

- entities, events, risks, simulations, decisions, governance, reports, flow logs, users, data sources

**Search modes**

- `Keyword`
- `Structured`
- `Semantic`
- `Recent`
- `Saved`

**Results row schema (bắt buộc)**

- `Type badge`
- `Confidence / Freshness`
- `Direct open` (primary action)
- `Related records`
- `Evidence access`

Actions per result:

- `Open Details`
- `Jump to Evidence`
- `View Lineage`

---

## 3. Flow Connect UI — menu đầy đủ

### 3.1 Route: `/flow/overview`

Cards:

- `Total Dispatches Today`
- `Success Rate`
- `Failures`
- `Average Latency`
- `Waiting Callbacks`
- `Top Flow Targets`
- `Decisions Sent to Flow`
- `Rules Auto-Dispatched`

Visual actions:

- Click to navigate to corresponding tables:
  - failures → `/flow/failures`
  - callbacks → `/flow/callbacks`
  - dispatches trend → `/flow/dispatches`
  - targets → `/flow/mappings?filter=target`

---

### 3.2 Route: `/flow/triggers`

Triggers list:

- `Trigger Name`
- `Trigger Source Type`
- `Payload Schema Version`
- `Approval Required`
- `Status`
- `Last Used`

Row actions:

- `Open Details`
- `Edit Mapping` (if permitted)
- `Disable Mapping`
- `Test Dry Run`

---

### 3.3 Route: `/flow/dispatches`

Dispatch table:

- `Dispatch ID`
- `Source Object`
- `Source Type`
- `Triggered By`
- `Target Flow`
- `Payload Version`
- `Status`
- `Callback Status`
- `Created At`

Row actions:

- `Open Details`
- `View Audit Trail`
- `Jump to Evidence`
- `Retry Execution` (if status allows)

Dispatch detail:

- `Full Payload`
- `Trace ID`
- `Approval References`
- `Decision Reference`
- `Simulation Reference`
- `Execution Logs Summary`
- `Retry History`

Detail actions:

- `Retry Execution`
- `Escalate to Governance`

---

### 3.4 Route: `/flow/executions`

Execution table:

- `Execution ID`
- `Target Flow`
- `Status`
- `Started At`
- `Finished At`
- `Latency`
- `Output Summary`
- `Side Effects`

Row actions:

- `Open Details`
- `Retry Execution`
- `Escalate to Governance`
- `Attach to Decision Review`

Execution detail:

- `Events generated back into CIOS`
  - action: `Open Details` (to events list with trace)

---

### 3.5 Route: `/flow/callbacks`

Callback queue list:

- `Callback ID`
- `Dispatch ID`
- `Status (missing/invalid/reconciled)`
- `Lag`
- `Error summary`

Actions:

- `Reconcile` (if permitted)
- `Retry Callback` (if permitted)
- `Jump to Evidence`

---

### 3.6 Route: `/flow/mappings`

Trigger mapping registry table:

- `Mapping Name`
- `Source Type`
- `Condition`
- `Target Flow ID/Name`
- `Payload Version`
- `Approval Required`
- `Status`
- `Last Used`
- `Success Rate`

Row actions:

- `View Mapping`
- `Edit Mapping`
- `Disable Mapping`
- `Duplicate`
- `Test Dry Run`

Mapping detail:

- show `payload contract` and `approval chain` link
- action: `View Audit Trail`

---

### 3.7 Route: `/flow/failures`

Failures views:

- `Recent Failures`
- `Repeated Failures`
- `High Impact Failures`
- `No Callback Failures`
- `Payload Validation Failures`

Failure row actions:

- `Retry Execution`
- `Disable Mapping`
- `Escalate to Governance`
- `Generate Report Now` (creates report item)
- `Open Decision Path` (open governance/decision)
- `View Audit Trail`

---

## 4. Admin System UI — menu đầy đủ

### 4.1 Route: `/admin/dashboard`

Widgets:

- `User Count`
- `Active Sessions`
- `Source Health`
- `Ingestion Jobs`
- `Queue Health`
- `Failed Reports`
- `Failed Flow Callbacks`
- `System Incidents`
- `Security Anomalies`

Widget click actions:

- open related route (users/sources/ingestion/audit/system-health)

---

### 4.2 Route: `/admin/users`

Table:

- `User`
- `Status`
- `Role`
- `Last Active`
- `Workspace Access`
- `Risk Flags`

Row actions:

- `View Audit Trail`
- `Suspend User`
- `Force Reset`

---

### 4.3 Route: `/admin/roles`

Role list:

- `Role Name`
- `Description`
- `Users count`

Actions:

- `Open Details`

---

### 4.4 Route: `/admin/permissions`

Matrix view:

- permissions: `read`, `write`, `approve`, `dispatch`, `configure`, `export`, `rollback`, `admin override`

Actions:

- `Save`
- `View Audit Trail`

---

### 4.5 Route: `/admin/sources`

Sources table:

- `Source Name`
- `Type`
- `Auth Status`
- `Freshness`
- `Last Successful Sync`
- `Error Count`
- `Owner`
- `Importance Tier`

Row actions:

- `Inspect Errors`
- `Retry Job`
- `View Lineage`

---

### 4.6 Route: `/admin/ingestion`

Ingestion jobs table:

- `Job Name`
- `Schedule`
- `Duration`
- `Status`
- `Rows Processed`
- `Rows Failed`
- `Retry Count`
- `Output Dataset`

Row actions:

- `Run Now`
- `Pause`
- `Retry Job`
- `Disable`
- `Inspect Errors`

---

### 4.7 Route: `/admin/warehouse`

Dataset views:

- `Raw Datasets`
- `Normalized Datasets`
- `Enriched Datasets`
- `Aggregated Datasets`
- `Semantic Views`
- `Index Status`
- `Vector Index Status`
- `Data Lineage Explorer`

Row actions:

- `Refresh`
- `Rebuild Index`
- `Flag Stale`
- `Archive`
- `Inspect Lineage` (label có thể dùng `View Lineage`)

---

### 4.8 Route: `/admin/rules`

Rules list categories:

- `Decision Rules`
- `Alert Rules`
- `Routing Rules`
- `Auto-escalation Rules`

Row actions:

- `Edit`
- `Rollback Review`
- `View Audit Trail`

---

### 4.9 Route: `/admin/scores`

Score families:

- `Trust`
- `Stress`
- `Resilience`
- `Stability`
- `Performance`
- `Economic`

Actions:

- `Edit Weights`
- `Edit Formulas`
- `Recalculate`
- `View Audit Trail`

---

### 4.10 Route: `/admin/risk-models`

Risk model config:

- categories
- severity thresholds
- confidence settings
- trend window
- escalation conditions

Actions:

- `Save`
- `Rollback Review`
- `View Audit Trail`

---

### 4.11 Route: `/admin/simulation-config`

Components:

- `Available models`
- `Parameter sets`
- `Snapshot policies`
- `Compare logic`
- `Confidence logic`
- `Scenario templates`

Actions:

- `Enable model`
- `Set default assumptions`
- `Freeze config version`
- `Audit change` (label: `View Audit Trail`)

---

### 4.12 Route: `/admin/decision-config`

Components:

- decision types
- priority matrix
- required evidence rules
- required simulation rules
- auto-create draft conditions
- auto-send to governance conditions

Actions:

- `Save`
- `Rollback Review`
- `View Audit Trail`

---

### 4.13 Route: `/admin/governance-config`

Components:

- approval policies
- quorum rules
- weighted approval
- override rules
- rollback policies
- sensitive action classes

Must have:

- per decision type governance matrix
- time-limited approvals
- emergency path
- human override path

Actions:

- `Save`
- `Rollback Review`
- `View Audit Trail`

---

### 4.14 Route: `/admin/reports-config`

Components:

- templates
- schedules
- delivery targets
- AI summary settings
- report audience rules
- escalation report rules

Actions:

- `Create schedule`
- `Preview template`
- `Send test`
- `Disable report`
- `Mark executive report`

---

### 4.15 Route: `/admin/flow-config`

Components:

- flow endpoint settings
- mapping registry
- callback config
- payload schema versions
- retry policy
- dead letter logic
- reconciliation rules

Actions:

- `Save`
- `View Audit Trail`
- `Test callback` (if supported)

---

### 4.16 Route: `/admin/audit`

Audit filters:

- `User`
- `Role`
- `Object Type`
- `Action`
- `Date`
- `Severity`

Audit row actions:

- `Open Details`
- `View Audit Trail`

Audit event detail:

- who, what, when, before, after, source, trace id, related approval, related dispatch

Actions:

- `Jump to Evidence`

---

### 4.17 Route: `/admin/security`

Widgets:

- active sessions
- suspicious access
- failed auth
- permission anomalies
- admin changes
- export logs
- IP patterns
- device patterns

Actions:

- `Kill session`
- `Suspend User`
- `Require re-auth`
- `Mark incident`
- `Escalate to root` (label có thể dùng `Escalate to Governance` nếu muốn thống nhất; nhưng prefer `Escalate to root`)

---

### 4.18 Route: `/admin/system-health`

Widgets:

- `API health`
- `DB health`
- `Queues`
- `Workers`
- `Ingest pipeline`
- `Report jobs`
- `Flow callbacks`
- `Stale indexes`
- `Failed simulations`

Actions:

- `Inspect Errors`
- `Retry Job`
- `View Audit Trail`

---

### 4.19 Route: `/admin/feature-flags`

Feature flags list:

- `enable simulation compare`
- `enable AI summary`
- `enable semantic search`
- `enable auto draft decisions`
- `enable flow auto dispatch`
- `enable enterprise governance`

Actions:

- `Enable`
- `Disable`
- `View Audit Trail`

---

## 5. Command palette (Full set label gợi ý)

Các lệnh hiển thị trong palette:

- `find entity {name}`
- `show high risks`
- `run quick simulation`
- `open today report`
- `view failed dispatches`
- `create governance request`
- `go to source health`
- `search events {query}`
- `open decision approvals`
- `open flow callbacks`
- `open data lineage`
- `view audit trail`

---

## 6. Chuỗi click xuyên màn hình (backbone)

Backbone bắt buộc trong UI:

```text
Data → Event → Risk → Simulation → Decision → Governance → Flow → Callback → State Update
```

Ví dụ action mapping (để DEV wire):

- Risk card `Open Full Context` → `/app/risks` detail → `Jump to Evidence` → `/app/events`
- Event evidence `View Lineage` → `/app/data` lineage panel
- Simulation result `Promote to Decision` → `/app/decisions` draft
- Decision `Dispatch to Flow` → `/flow/dispatches`
- Dispatch execution `events back into CIOS` → `/app/events` + system state update

---

**Component spec + data contract đã có:** `docs/CIOS_UI_COMPONENT_DATA_CONTRACT.md` (JSON field contract + API mapping theo page).

