# FILE: API_MASTER_SPEC.md

# CUSTOMER INTELLIGENCE OS
## API MASTER SPEC
Phiên bản: v1
Mục tiêu: Thiết kế API production-ready cho web app, mobile app, admin console, workflow engine, AI enrichment, compliance console, billing, audit, export governance.

==================================================
I. NGUYÊN TẮC API
==================================================

1. API là tenant-scoped mặc định
Mọi request dữ liệu nghiệp vụ phải gắn với workspace hiện tại.

2. Backend mới là nơi quyết định quyền
Frontend chỉ hiển thị.
Permission, plan gating, compliance gating đều kiểm ở server.

3. Không trả dữ liệu vượt gói member
Không chỉ ẩn UI.
Response phải filter theo plan và permission.

4. Source lineage là bắt buộc
Mọi field quan trọng khi cần phải truy ngược nguồn được.

5. AI output phải phân biệt rõ inferred với source-backed
API phải trả metadata cho client biết field nào là suy luận.

6. Outreach, export, delete là hành động nhạy cảm
Phải có approval hoặc compliance gate khi cần.

7. Audit tất cả hành động quan trọng
Create, update, delete, export, approve, reject, run workflow, generate AI, access compliance.

==================================================
II. AUTHENTICATION / AUTHORIZATION
==================================================

### Auth model
- Session cookie cho web
- Bearer token cho mobile / API clients
- API keys cho server-to-server integrations
- Hỗ trợ SSO cho enterprise ở phase sau

### Required headers
- Authorization: Bearer <token> hoặc session auth
- X-Workspace-Id: <uuid> nếu hệ hỗ trợ chuyển workspace
- X-Request-Id: <uuid> khuyến nghị
- Idempotency-Key: bắt buộc cho POST nhạy cảm

### Permission layers
1. Authenticated
2. Workspace membership
3. Role permission
4. Plan permission
5. Compliance permission
6. Record-level policy

==================================================
III. RESPONSE STANDARD
==================================================

### Success
```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "uuid",
    "workspace_id": "uuid"
  }
}
````

### Error

```json
{
  "ok": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource.",
    "details": {}
  },
  "meta": {
    "request_id": "uuid"
  }
}
```

### Pagination

```json
{
  "ok": true,
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 25,
    "total": 1234,
    "has_next": true
  }
}
```

### Cursor pagination cho bảng lớn

```json
{
  "ok": true,
  "data": [],
  "meta": {
    "next_cursor": "opaque_cursor",
    "has_next": true
  }
}
```

==================================================
IV. ERROR CODES
===============

* UNAUTHORIZED
* FORBIDDEN
* PLAN_LIMIT_REACHED
* VALIDATION_ERROR
* NOT_FOUND
* CONFLICT
* RATE_LIMITED
* COMPLIANCE_BLOCKED
* SUPPRESSION_BLOCKED
* APPROVAL_REQUIRED
* SOURCE_POLICY_DENIED
* INTERNAL_ERROR
* WORKFLOW_BUSY
* EXPORT_NOT_ALLOWED
* DELETE_REVIEW_REQUIRED

==================================================
V. API GROUPS
=============

1. Auth
2. Workspace
3. Members / Roles / Permissions
4. Billing / Usage / Plans
5. Organizations
6. Contacts
7. Leads
8. Opportunities
9. Pipelines / Stages
10. Tasks / Activities / Notes
11. Search / Saved Views
12. Source Governance / Crawl
13. Source Records / Lineage / Proofs
14. AI Enrichment / Signals / Scores
15. Workflows / Workflow Runs
16. Compliance / Consent / Suppression / Deletion
17. Exports
18. Notifications
19. Audit Logs
20. Connectors / Webhooks / API Keys
21. Admin-only APIs

==================================================
VI. AUTH API
============

### POST /v1/auth/login

Body:

```json
{
  "email": "user@example.com",
  "password": "********"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "User"
    },
    "session": {
      "expires_at": "2026-03-31T00:00:00Z"
    }
  }
}
```

### POST /v1/auth/logout

### GET /v1/auth/me

Returns:

* current user
* current workspace
* role
* permissions
* plan
* feature flags

==================================================
VII. WORKSPACE API
==================

### GET /v1/workspaces/current

### PATCH /v1/workspaces/current

Editable fields:

* name
* timezone
* billing_email
* settings_json subset

### GET /v1/workspaces/current/features

Returns effective feature flags after:

* plan
* role
* workspace overrides

==================================================
VIII. MEMBERS / ROLES / PERMISSIONS API
=======================================

### GET /v1/members

### POST /v1/members/invite

Body:

```json
{
  "email": "newuser@example.com",
  "role": "sales_rep"
}
```

### PATCH /v1/members/{memberId}

### DELETE /v1/members/{memberId}

### GET /v1/roles

### GET /v1/permissions

LƯU Ý:

* Chỉ owner/admin phù hợp mới được mời
* Không cho role escalation trái quyền
* Audit bắt buộc

==================================================
IX. PLANS / BILLING / USAGE API
===============================

### GET /v1/plans

### GET /v1/billing/subscription

### GET /v1/billing/usage

### GET /v1/billing/usage/summary

### POST /v1/billing/checkout

### POST /v1/billing/portal

Usage summary trả:

* records_viewed
* ai_summaries
* workflow_runs
* exports_count
* seats_used

==================================================
X. ORGANIZATIONS API
====================

### GET /v1/organizations

Query:

* q
* industry
* city
* country
* owner_user_id
* freshness_min
* priority_min
* signal_type
* has_public_email
* page
* page_size
  hoặc cursor

### POST /v1/organizations

### GET /v1/organizations/{id}

### PATCH /v1/organizations/{id}

### DELETE /v1/organizations/{id}

### GET /v1/organizations/{id}/timeline

Returns:

* activities
* notes
* signals
* score history
* workflow actions

### GET /v1/organizations/{id}/source-trace

Plan gated.
Returns:

* field lineage
* source records
* proofs if permitted

### GET /v1/organizations/{id}/ai-summary

Returns:

* source_backed_summary
* inferred_summary
* model_version
* confidence

### POST /v1/organizations/{id}/refresh

Triggers re-fetch pipeline within policy.

==================================================
XI. CONTACTS API
================

### GET /v1/contacts

Query:

* q
* organization_id
* role_title
* contactability_class
* do_not_contact
* owner_user_id

### POST /v1/contacts

### GET /v1/contacts/{id}

### PATCH /v1/contacts/{id}

### DELETE /v1/contacts/{id}

### GET /v1/contacts/{id}/source-trace

### POST /v1/contacts/{id}/mark-do-not-contact

Body:

```json
{
  "reason": "User requested no contact"
}
```

==================================================
XII. LEADS API
==============

### GET /v1/leads

Filters:

* status
* owner_user_id
* pipeline_id
* stage_id
* min_priority
* min_fit
* min_intent
* min_compliance
* organization_id

### POST /v1/leads

### GET /v1/leads/{id}

### PATCH /v1/leads/{id}

### DELETE /v1/leads/{id}

### POST /v1/leads/{id}/assign

### POST /v1/leads/{id}/move-stage

### POST /v1/leads/{id}/recompute-score

Response recompute score:

```json
{
  "ok": true,
  "data": {
    "lead_id": "uuid",
    "latest_score": {
      "fit_score": 84.5,
      "intent_score": 78.0,
      "timing_score": 67.5,
      "compliance_score": 95.0,
      "priority_score": 81.2,
      "explanation": "High fit due to industry and company size..."
    }
  }
}
```

==================================================
XIII. OPPORTUNITIES API
=======================

### GET /v1/opportunities

### POST /v1/opportunities

### GET /v1/opportunities/{id}

### PATCH /v1/opportunities/{id}

### DELETE /v1/opportunities/{id}

### POST /v1/opportunities/{id}/move-stage

### POST /v1/opportunities/{id}/mark-won

### POST /v1/opportunities/{id}/mark-lost

==================================================
XIV. PIPELINES API
==================

### GET /v1/pipelines

### POST /v1/pipelines

### PATCH /v1/pipelines/{id}

### DELETE /v1/pipelines/{id}

### GET /v1/pipelines/{id}/stages

### POST /v1/pipelines/{id}/stages

### PATCH /v1/pipeline-stages/{id}

### DELETE /v1/pipeline-stages/{id}

==================================================
XV. TASKS / NOTES / ACTIVITIES API
==================================

### GET /v1/tasks

### POST /v1/tasks

### GET /v1/tasks/{id}

### PATCH /v1/tasks/{id}

### DELETE /v1/tasks/{id}

### POST /v1/tasks/{id}/complete

### GET /v1/notes

### POST /v1/notes

### PATCH /v1/notes/{id}

### DELETE /v1/notes/{id}

### GET /v1/activities

Read only timeline endpoint.

==================================================
XVI. SEARCH API
===============

### GET /v1/search/organizations

### GET /v1/search/contacts

### GET /v1/search/leads

### GET /v1/search/global

Global query params:

* q
* entity_types[]
* filters_json
* cursor

Response:

```json
{
  "ok": true,
  "data": {
    "organizations": [],
    "contacts": [],
    "leads": []
  },
  "meta": {
    "next_cursor": "opaque"
  }
}
```

### POST /v1/saved-views

### GET /v1/saved-views

### GET /v1/saved-views/{id}

### PATCH /v1/saved-views/{id}

### DELETE /v1/saved-views/{id}

==================================================
XVII. SOURCE GOVERNANCE API
===========================

### GET /v1/domain-policies

Filters:

* domain
* policy_decision
* source_type
* terms_review_status

### POST /v1/domain-policies

### GET /v1/domain-policies/{id}

### PATCH /v1/domain-policies/{id}

### POST /v1/domain-policies/check

Body:

```json
{
  "domain": "example.com"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "domain": "example.com",
    "robots_status": "checked",
    "policy_decision": "allow_limited",
    "crawl_delay_ms": 5000
  }
}
```

### GET /v1/crawl-policies

### POST /v1/crawl-policies

### PATCH /v1/crawl-policies/{id}

### GET /v1/crawl-jobs

### POST /v1/crawl-jobs

Body:

```json
{
  "seed_url": "https://example.com",
  "crawl_policy_id": "uuid"
}
```

### GET /v1/crawl-jobs/{id}

### POST /v1/crawl-jobs/{id}/cancel

LƯU Ý:

* Tạo crawl job phải qua SOURCE_POLICY_DENIED check
* Không tạo crawl nếu domain deny
* Không tự nâng quyền allow bằng API user thường

==================================================
XVIII. SOURCE RECORDS / LINEAGE / PROOFS API
============================================

### GET /v1/source-records

Filters:

* entity_type
* entity_id
* field_name
* source_type

### GET /v1/source-records/{id}

### GET /v1/field-lineage

### GET /v1/source-proofs/{id}

Plan gating:

* Free: không cho xem
* Starter: có thể xem nguồn hạn chế
* Growth: xem khá đầy đủ
* Pro/Enterprise: xem đầy đủ proof nếu đủ quyền

==================================================
XIX. AI ENRICHMENT / SIGNALS / SCORES API
=========================================

### GET /v1/model-versions

### GET /v1/ai-enrichments

### POST /v1/ai-enrichments/generate

Body:

```json
{
  "entity_type": "organization",
  "entity_id": "uuid",
  "enrichment_type": "company_summary"
}
```

### GET /v1/signal-events

Filters:

* organization_id
* signal_type
* min_strength
* detected_after

### GET /v1/lead-scores

### GET /v1/leads/{id}/score-history

### POST /v1/leads/{id}/score-preview

Dùng cho UI preview trước khi ghi chính thức.

LƯU Ý:

* AI generate phải có quota check
* Cần cost tracking
* Cần model_version trả về
* Không cho AI ghi trực tiếp sang source_records

==================================================
XX. WORKFLOWS API
=================

### GET /v1/workflows

### POST /v1/workflows

### GET /v1/workflows/{id}

### PATCH /v1/workflows/{id}

### DELETE /v1/workflows/{id}

### POST /v1/workflows/{id}/activate

### POST /v1/workflows/{id}/pause

### POST /v1/workflows/{id}/run

Body:

```json
{
  "dry_run": false
}
```

### GET /v1/workflows/{id}/runs

### GET /v1/workflow-runs/{id}

### POST /v1/workflow-runs/{id}/cancel

Workflow run response:

```json
{
  "ok": true,
  "data": {
    "run_id": "uuid",
    "status": "queued"
  }
}
```

LƯU Ý:

* Idempotency-Key bắt buộc cho run manual
* Workflow nhạy cảm phải kiểm approval
* Có dry_run mode cho retention, export, outreach

==================================================
XXI. COMPLIANCE API
===================

### GET /v1/legal-basis-records

### POST /v1/legal-basis-records

### PATCH /v1/legal-basis-records/{id}

### GET /v1/consent-records

### POST /v1/consent-records

### GET /v1/suppression-list

### POST /v1/suppression-list

### PATCH /v1/suppression-list/{id}

### POST /v1/suppression-list/check

Body:

```json
{
  "scope": "email",
  "value": "contact@example.com"
}
```

### GET /v1/deletion-requests

### POST /v1/deletion-requests

Public-safe endpoint cũng có thể có variant ngoài auth.

### GET /v1/deletion-requests/{id}

### POST /v1/deletion-requests/{id}/approve

### POST /v1/deletion-requests/{id}/reject

### POST /v1/deletion-requests/{id}/complete

### GET /v1/retention-rules

### POST /v1/retention-rules

### PATCH /v1/retention-rules/{id}

### POST /v1/compliance/outreach-check

Body:

```json
{
  "channel": "email",
  "target_entity_type": "contact",
  "target_entity_id": "uuid"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "allowed": false,
    "reason_code": "SUPPRESSION_BLOCKED",
    "details": {
      "suppression_match": true
    }
  }
}
```

==================================================
XXII. EXPORTS API
=================

### GET /v1/exports

### POST /v1/exports/request

Body:

```json
{
  "export_type": "contacts_csv",
  "filters_json": {
    "organization_id": "uuid"
  },
  "reason": "Sales review"
}
```

### GET /v1/exports/{id}

### POST /v1/exports/{id}/approve

### POST /v1/exports/{id}/reject

### POST /v1/exports/{id}/download-link

LƯU Ý:

* Export phải check:

  * permission
  * plan
  * compliance flags
  * anomaly thresholds
* Download link phải signed URL
* File phải có watermark logic nếu cần

==================================================
XXIII. NOTIFICATIONS API
========================

### GET /v1/notifications

### POST /v1/notifications/{id}/read

### POST /v1/notifications/read-all

==================================================
XXIV. AUDIT / PRIVACY / SECURITY EVENTS API
===========================================

### GET /v1/audit-logs

Filters:

* actor_user_id
* entity_type
* entity_id
* action
* date_from
* date_to

### GET /v1/privacy-events

### GET /v1/security-events

LƯU Ý:

* Read-only
* Chỉ role đủ quyền mới xem
* Có mask dữ liệu nhạy cảm trong before/after nếu cần

==================================================
XXV. CONNECTORS / WEBHOOKS / API KEYS API
=========================================

### GET /v1/connectors

### POST /v1/connectors

### GET /v1/connectors/{id}

### PATCH /v1/connectors/{id}

### DELETE /v1/connectors/{id}

### POST /v1/connectors/{id}/sync

### GET /v1/webhooks

### POST /v1/webhooks

### PATCH /v1/webhooks/{id}

### DELETE /v1/webhooks/{id}

### POST /v1/webhooks/{id}/test

### GET /v1/api-keys

### POST /v1/api-keys

### DELETE /v1/api-keys/{id}

API key create response:

```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "Internal BI",
    "key": "show_once_secret"
  }
}
```

LƯU Ý:

* Secret chỉ trả đúng 1 lần
* Chỉ lưu hash ở DB

==================================================
XXVI. ADMIN-ONLY API
====================

Prefix: /v1/admin/*

### GET /v1/admin/review-queues

### POST /v1/admin/review-queues/{id}/approve

### POST /v1/admin/review-queues/{id}/reject

### GET /v1/admin/model-center

### POST /v1/admin/model-center/activate

### GET /v1/admin/data-quality/summary

### GET /v1/admin/crawl-monitor

### GET /v1/admin/abuse-monitor

### POST /v1/admin/retention/run

Body:

```json
{
  "dry_run": true
}
```

### POST /v1/admin/security/revoke-user-sessions

### POST /v1/admin/exports/{id}/force-expire

==================================================
XXVII. PLAN GATING MATRIX
=========================

### Free

* organizations list basic
* contacts limited
* no source trace
* no exports
* no compliance console
* limited AI

### Starter

* limited exports
* limited AI
* limited workflows
* limited source trace

### Growth

* scoring
* alerts
* more search depth
* more refresh
* source trace partial

### Pro

* compliance console
* full exports with policy
* advanced workflows
* API access
* full source trace with permissions

### Enterprise

* all pro
* SSO
* private connectors
* custom models
* advanced governance
* region controls

==================================================
XXVIII. RATE LIMITING
=====================

Default:

* Authenticated UI requests: 120 req/min/user
* Search endpoints: 60 req/min/user
* AI generate endpoints: 20 req/min/workspace
* Export requests: 10 req/day/workspace
* Crawl job create: 20 req/day/workspace
* API key traffic: contract-based

On breach:

* 429 RATE_LIMITED

==================================================
XXIX. AUDIT EVENTS BẮT BUỘC
===========================

Phải audit các action sau:

* login success/fail
* member invite/remove
* role change
* organization create/update/delete
* contact do_not_contact
* lead stage change
* score recompute
* crawl policy change
* crawl job create/cancel
* suppression add/remove
* deletion request approve/reject/complete
* export request/approve/reject/download
* workflow activate/pause/run/cancel
* connector create/update/delete
* api key create/revoke
* webhook create/update/delete/test

==================================================
XXX. VALIDATION RULES CỐT LÕI
=============================

1. workspace_id từ auth context, không tin body client
2. source_url phải là URL hợp lệ
3. primary_domain phải normalized
4. public_business_email phải validate format
5. không cho set legal_basis tùy tiện nếu role không đủ
6. deletion complete phải có approved state trước
7. export approve không cùng người request nếu policy yêu cầu 4-eyes
8. workflow run phải check status active hoặc allowed manual
9. suppression active phải block outreach ngay
10. contact do_not_contact phải sync suppression khi policy bật

==================================================
XXXI. WEBHOOK EVENTS
====================

Các event outbound:

* organization.created
* organization.updated
* contact.created
* contact.updated
* lead.created
* lead.updated
* lead.score.updated
* workflow.run.completed
* export.completed
* deletion_request.completed
* compliance.suppression.updated

Payload mẫu:

```json
{
  "event": "lead.score.updated",
  "workspace_id": "uuid",
  "timestamp": "2026-03-24T10:00:00Z",
  "data": {
    "lead_id": "uuid",
    "priority_score": 82.1
  }
}
```

==================================================
XXXII. MOBILE API NOTES
=======================

Mobile chỉ nên dùng:

* /auth/*
* /organizations/*
* /contacts/*
* /leads/*
* /tasks/*
* /notifications/*
* /ai-summary lightweight
* /timeline lightweight

Không mở cho mobile:

* admin APIs
* export approve
* crawl governance edit
* retention edit
* webhook / api key management

==================================================
XXXIII. DEV LƯU Ý TRONG CODE
============================

1. Không bao giờ trust plan gating ở frontend.
2. Không để serializer vô tình trả field source trace cho plan thấp.
3. Không cho endpoint AI ghi vào source_records.
4. Không cho contact outreach nếu suppression match.
5. Không cho export link sống quá lâu.
6. Không để audit fail làm fail request chính, nhưng phải có fallback queue.
7. Không lộ before_json / after_json nhạy cảm ra client thường.
8. Không cho search API trở thành endpoint dump dữ liệu hàng loạt.
9. Không dùng soft delete mà quên filter deleted_at ở mọi query.
10. Không cho tenant A query dữ liệu tenant B dù biết UUID.
11. Không để workflow run lặp vô hạn khi retry.
12. Không cho domain policy manual override nếu user không đủ quyền.
13. Không cho deletion request auto-complete nếu chưa review.
14. Không cho compliance score chỉ là hiển thị, nó phải chặn hành động thật.
15. Không cho mobile cache dữ liệu compliance sâu quá lâu.

==================================================
XXXIV. GỢI Ý THỨ TỰ BUILD API
=============================

Phase 1

* auth
* workspace
* members
* plans / usage
* organizations
* contacts
* leads
* tasks
* notes
* basic search

Phase 2

* source governance
* crawl jobs
* source records
* field lineage
* ai enrichments
* signals
* lead scores

Phase 3

* workflows
* suppression
* deletion requests
* retention rules
* exports
* audit logs
* notifications

Phase 4

* connectors
* webhooks
* api keys
* admin center
* advanced compliance
* enterprise additions

==================================================
XXXV. KẾT LUẬN
==============

API này phải được xây như một nền tảng dữ liệu doanh nghiệp minh bạch:

* permission-first
* compliance-first
* source-traceable
* plan-aware
* audit-ready
* AI-safe
* export-controlled
* workflow-governed

Không được build như tool scrape thô.
Phải build như hạ tầng Customer Intelligence OS.

END FILE

