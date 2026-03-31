# CIOS — UI Component Spec + Data Contract

Mục tiêu: bridge trực tiếp giữa `UI` và `API/data contract` để DEV implement nhanh, ít lệch.

Tham chiếu: `docs/CIOS_APP_UI_MASTER.md`, `docs/CIOS_APP_UI_FULL_MENU.md`, `docs/CIOS_BUILD_ORDER_LOCK.md`.

---

## 1) Contract conventions (áp dụng toàn hệ)

### 1.1 Response envelope chuẩn

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "trace_id": "trc_...",
    "time_range": "24h",
    "freshness": "fresh|stale|partial",
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 0
    }
  },
  "error": null
}
```

### 1.2 Common object fields

- `id` (internal id)
- `public_id` (public-safe id)
- `status`
- `created_at`
- `updated_at`
- `trace_id` (when available)

### 1.3 UI state contract

Mọi endpoint cho UI phải trả được trạng thái:

- `freshness`: `fresh | stale | partial`
- `completeness`: `full | partial`
- `permission`: `allowed | denied`

---

## 2) App UI components → contract

## 2.1 `/app/overview`

### Component: `SystemStatusStrip`

Endpoint: `GET /v1/system/state?range=24h`

```json
{
  "health": { "value": 82, "trend_24h": -3.2, "trend_7d": 1.1, "severity": "medium" },
  "trust_index": { "value": 71, "trend_24h": -2.0, "severity": "high" },
  "stress_index": { "value": 64, "trend_24h": 5.4, "severity": "high" },
  "resilience_index": { "value": 58, "trend_24h": -1.8, "severity": "medium" },
  "active_risk_count": { "value": 129, "trend_24h": 14, "severity": "critical" },
  "data_freshness": { "value": 0.94, "stale_sources": 3, "severity": "medium" }
}
```

### Component: `TopProblemsPanel`

Endpoint: `GET /v1/system/problems/top?limit=5&range=24h`

```json
[
  {
    "problem_id": "prb_001",
    "title": "Dispatch failures in financial workflows",
    "severity": "critical",
    "why_it_matters": "Blocks risk mitigation actions",
    "impacted_area": ["flow", "risk", "operations"],
    "suggested_next_action": "Review failed mappings and retry with governance",
    "context_link": "/app/risks?problemId=prb_001"
  }
]
```

### Component: `ActiveAlertsList`

Endpoint: `GET /v1/risks/alerts?status=active&range=24h`

Required fields:

- `alert_id`, `severity`, `source`, `first_seen`, `last_seen`
- `related_entities[]`, `related_risks[]`
- `decision_path_available` (bool)

### Component: `DecisionQueueSummary`

Endpoint: `GET /v1/decisions/summary?range=today`

```json
{
  "pending_approvals": 18,
  "recommendations_ready": 27,
  "executed_today": 12,
  "rejected_today": 3,
  "rollback_candidates": 2
}
```

### Component: `FlowDispatchSummary`

Endpoint: `GET /v1/flow/summary?range=today`

Required fields:

- `dispatched`, `success`, `failed`, `waiting_callback`, `retry_needed`

---

## 2.2 `/app/entities`

### Component: `EntityTable`

Endpoint: `GET /v1/entities`

Query params:

- `type`, `region`, `status`, `risk_level`, `score_min`, `score_max`, `updated_from`, `updated_to`, `tags[]`, `page`, `page_size`

Row contract:

```json
{
  "entity_id": "ent_001",
  "name": "Acme Ops Cluster",
  "type": "organization",
  "status": "warning",
  "trust_score": 63.1,
  "stress_score": 72.4,
  "risk_count": 9,
  "last_event_at": "2026-03-31T07:33:00Z",
  "linked_decision_count": 3,
  "linked_flow_count": 5
}
```

### Component: `EntityDetailDrawer`

Endpoint: `GET /v1/entities/:id/details`

Must include:

- profile summary
- related entities
- score history points
- active risks
- recent simulations
- related decisions
- related flows

---

## 2.3 `/app/events`

### Component: `EventStream`

Endpoint: `GET /v1/events`

Query params:

- `range`, `type`, `source`, `severity`, `entity_id`, `risk_id`, `view_mode`

Event row contract:

```json
{
  "event_id": "evt_001",
  "timestamp": "2026-03-31T08:00:00Z",
  "title": "Payment retry queue exceeded threshold",
  "event_type": "operational.anomaly",
  "source": "payments_worker",
  "severity": "high",
  "entity_id": "ent_001",
  "risk_id": "rsk_204",
  "state": "active",
  "evidence_url": "/v1/events/evt_001/evidence"
}
```

### Component: `EventDetailPanel`

Endpoint: `GET /v1/events/:id`

Must include:

- `raw_event`
- `normalized_event`
- `source_lineage`
- `downstream_impact`
- `linked_alerts`, `linked_simulations`, `linked_decisions`, `linked_dispatches`

---

## 2.4 `/app/risks`

### Component: `RiskTable`

Endpoint: `GET /v1/risks`

Row contract:

```json
{
  "risk_id": "rsk_204",
  "title": "Rising failed payouts",
  "type": "financial",
  "severity": "critical",
  "confidence": 0.87,
  "affected_entities": ["ent_001", "ent_017"],
  "trend": "rising",
  "predicted_growth_7d": 0.34,
  "recommended_action": "Escalate + route to crisis flow"
}
```

### Component: `RiskDetailDrawer`

Endpoint: `GET /v1/risks/:id`

Must include:

- why flagged
- supporting evidence
- source events
- affected scores
- linked simulation, decision, flow status

---

## 2.5 `/app/scores`

### Component: `ScoreSummaryCards`

Endpoint: `GET /v1/scores/summary?range=24h`

Must include families:

- trust, stress, resilience, stability, performance, economic (+ mission alignment if enabled)

### Component: `EntityScoreTable`

Endpoint: `GET /v1/scores/entities`

Row required:

- `entity_id`, `family`, `value`, `confidence`, `last_recalculated_at`, `change_reason`, `source_event_ids[]`

---

## 2.6 `/app/data` (Data Query)

### Component: `QueryBuilder`

Endpoint: `POST /v1/data/query`

Request contract:

```json
{
  "dataset": "warehouse_enriched_events",
  "filters": {
    "entity_types": ["organization"],
    "date_range": { "from": "2026-03-24", "to": "2026-03-31" },
    "source": ["payments_worker"],
    "risk_level": ["high", "critical"],
    "score_range": { "trust_min": 0, "trust_max": 70 },
    "status": ["active"],
    "tags": ["finance"],
    "text_query": "failed dispatch",
    "semantic_query": "events linked to failed dispatch"
  },
  "mode": "structured|semantic",
  "result_mode": "table|timeline|cards|graph",
  "compare_windows": false
}
```

### Component: `LineagePanel`

Endpoint: `GET /v1/data/lineage?dataset=...`

Must include:

- source nodes
- transform nodes
- quality flags
- freshness
- downstream usage

---

## 2.7 `/app/reports`

### Component: `ReportSummaryCards`

Endpoint: `GET /v1/reports/summary`

### Component: `ReportLibraryTable`

Endpoint: `GET /v1/reports?type=scheduled|past|pinned|exported`

### Component: `ReportDetail`

Endpoint: `GET /v1/reports/:id`

Must include:

- executive summary
- metric delta
- risk summary
- decisions summary
- flow summary
- data issues
- suggested actions

---

## 2.8 `/app/simulation`

### Component: `ScenarioBuilder`

Endpoint: `POST /v1/simulations/run`

Request contract:

```json
{
  "snapshot_id": "snp_001",
  "entity_ids": ["ent_001", "ent_017"],
  "parameter_overrides": { "stress_multiplier": 1.2 },
  "injected_events": [{ "type": "financial.shock", "value": 0.3 }],
  "policy_changes": [{ "policy_id": "pol_002", "new_value": "strict" }],
  "score_weight_changes": [{ "family": "trust", "weight": 1.1 }],
  "horizon": "7d"
}
```

Required validation:

- reject run when `snapshot_id` missing

### Component: `SimulationResultPanel`

Endpoint: `GET /v1/simulations/:id`

Must include:

- predicted score changes
- predicted risk changes
- affected entities
- impact graph data
- confidence
- baseline comparison

Actions contract:

- `POST /v1/decisions` from simulation (`Promote to Decision`)

---

## 2.9 `/app/decisions`

### Component: `DecisionList`

Endpoint: `GET /v1/decisions?view=...`

Views:

- recommendations, drafts, pending_approval, approved, rejected, executed, rolled_back

### Component: `DecisionDetail`

Endpoint: `GET /v1/decisions/:id`

Actions:

- `POST /v1/decisions/:id/request-approval`
- `POST /v1/decisions/:id/approve`
- `POST /v1/decisions/:id/reject`
- `POST /v1/flow/dispatch` (from approved decision)

---

## 2.10 `/app/governance`

### Component: `ApprovalQueue`

Endpoint: `GET /v1/governance/requests?status=pending`

### Component: `ApprovalDetail`

Endpoint: `GET /v1/governance/requests/:id`

Actions:

- `POST /v1/governance/requests/:id/approve`
- `POST /v1/governance/requests/:id/reject`
- `POST /v1/governance/requests/:id/request-evidence`
- `POST /v1/governance/requests/:id/escalate`

---

## 2.11 `/app/timeline`

### Component: `TimelineTracks`

Endpoint: `GET /v1/timeline`

Tracks:

- events, risks, score_shifts, simulations, decisions, governance_actions, flow_executions, reports

Required each item:

- `item_type`, `item_id`, `timestamp`, `title`, `related_ids[]`, `trace_id`

---

## 2.12 `/app/search`

### Component: `GlobalSearch`

Endpoint: `POST /v1/search`

Request:

```json
{
  "query": "high risks this week",
  "mode": "keyword|structured|semantic|recent|saved",
  "domains": ["risks", "events", "decisions"],
  "filters": {
    "range": "7d"
  }
}
```

Result row required:

- type badge
- confidence/freshness
- direct route
- related records
- evidence link

---

## 3) Flow Connect contracts

## 3.1 `/flow/overview`

Endpoint: `GET /v1/flow/overview`

Must include:

- dispatch totals
- success/fail rates
- avg latency
- callback health
- top flow targets

## 3.2 `/flow/mappings`

Endpoints:

- `GET /v1/flow/mappings`
- `PATCH /v1/flow/mappings/:id`
- `POST /v1/flow/mappings/:id/test-dry-run`
- `POST /v1/flow/mappings/:id/disable`

## 3.3 `/flow/dispatches`

Endpoints:

- `GET /v1/flow/dispatches`
- `GET /v1/flow/dispatches/:id`
- `POST /v1/flow/dispatches/:id/retry`

## 3.4 `/flow/executions`

Endpoints:

- `GET /v1/flow/executions`
- `GET /v1/flow/executions/:id`

Execution states:

- pending, running, success, failed, cancelled, partial, timeout

## 3.5 `/flow/callbacks`

Endpoints:

- `GET /v1/flow/callbacks`
- `POST /v1/flow/callbacks/reconcile`

## 3.6 `/flow/failures`

Endpoint:

- `GET /v1/flow/failures`

Row must include:

- failure type
- impact level
- retryability
- linked decision
- linked mapping

---

## 4) Admin contracts

## 4.1 Users / roles / permissions

- `GET /v1/admin/users`
- `PATCH /v1/admin/users/:id`
- `GET /v1/admin/roles`
- `GET /v1/admin/permissions`
- `PATCH /v1/admin/permissions`

## 4.2 Sources / ingestion / warehouse

- `GET /v1/admin/sources`
- `GET /v1/admin/ingestion/jobs`
- `POST /v1/admin/ingestion/jobs/:id/run`
- `POST /v1/admin/ingestion/jobs/:id/retry`
- `GET /v1/admin/warehouse/datasets`
- `POST /v1/admin/warehouse/rebuild-index`

## 4.3 Rules / models / configs

- `GET|PATCH /v1/admin/rules`
- `GET|PATCH /v1/admin/scores/config`
- `GET|PATCH /v1/admin/risk-models`
- `GET|PATCH /v1/admin/simulation/config`
- `GET|PATCH /v1/admin/decision/config`
- `GET|PATCH /v1/admin/governance/config`
- `GET|PATCH /v1/admin/reports/config`
- `GET|PATCH /v1/admin/flow/config`

## 4.4 Audit / security / health / feature flags

- `GET /v1/admin/audit`
- `GET /v1/admin/security`
- `POST /v1/admin/security/kill-session`
- `POST /v1/admin/security/suspend-user`
- `GET /v1/admin/system-health`
- `GET|PATCH /v1/admin/feature-flags`

---

## 5) Priority implement map (UI + contract)

### Priority 1

- overview, events, risks, decisions, governance, flow overview, admin dashboard
- contracts needed immediately:
  - `/v1/system/state`
  - `/v1/system/problems/top`
  - `/v1/risks`, `/v1/risks/alerts`
  - `/v1/events`
  - `/v1/decisions*`
  - `/v1/governance*`
  - `/v1/flow/overview`

### Priority 2

- entities, scores, data query, reports, dispatches, callbacks, sources, ingestion

### Priority 3

- simulation studio full, search full, warehouse lineage advanced, config modules, feature flags, command palette

---

## 6) Definition of done (UI contract layer)

Một màn hình được xem là done khi:

1. Có component đầy đủ theo `CIOS_APP_UI_FULL_MENU.md`.
2. Đã map endpoint thật (không hardcode).
3. Có đầy đủ UI states: loading/empty/no-permission/stale/partial/error/retry.
4. Có click-chain tới object liên quan (evidence, lineage, decision path, flow trace).
5. Có audit visibility cho action quan trọng.

---

*Bản này dùng để dev FE/BE ký contract trước khi build chi tiết component.*

