# FILE: API_MASTER_SPEC.md

# CUSTOMER INTELLIGENCE OS API SPEC

Base URL:
https://api.yourdomain.com/v1

Auth:
- Bearer Token (JWT)
- API Key (server-to-server)

==================================================
I. AUTH
==================================================

POST /auth/login
POST /auth/register
POST /auth/refresh
POST /auth/logout

==================================================
II. WORKSPACE
==================================================

GET /workspaces
POST /workspaces
GET /workspaces/:id
PATCH /workspaces/:id

==================================================
III. ORGANIZATIONS
==================================================

GET /organizations
POST /organizations
GET /organizations/:id
PATCH /organizations/:id
DELETE /organizations/:id

QUERY:
- search
- industry
- country
- score
- signal

==================================================
IV. CONTACTS
==================================================

GET /contacts
POST /contacts
GET /contacts/:id
PATCH /contacts/:id
DELETE /contacts/:id

==================================================
V. LEADS
==================================================

GET /leads
POST /leads
GET /leads/:id
PATCH /leads/:id
DELETE /leads/:id

POST /leads/:id/assign
POST /leads/:id/score

==================================================
VI. PIPELINES
==================================================

GET /pipelines
POST /pipelines
GET /pipelines/:id

==================================================
VII. AI ENRICHMENT
==================================================

POST /ai/enrich
POST /ai/summary
POST /ai/recommend

==================================================
VIII. SEARCH
==================================================

GET /search

Params:
- query
- industry
- location
- signals
- score_range
- compliance_safe

==================================================
IX. WORKFLOWS
==================================================

GET /workflows
POST /workflows
POST /workflows/run
GET /workflows/:id/logs

==================================================
X. COMPLIANCE
==================================================

GET /compliance/source/:entity_id
POST /compliance/delete-request
GET /compliance/suppression
POST /compliance/suppression

==================================================
XI. EXPORT
==================================================

POST /export
GET /export/history

==================================================
XII. BILLING
==================================================

GET /billing
GET /usage
POST /subscribe

==================================================
XIII. ADMIN
==================================================

GET /admin/crawl-jobs
GET /admin/domain-policies
POST /admin/domain-policies

==================================================
XIV. WEBHOOKS
==================================================

POST /webhooks/register
POST /webhooks/events

==================================================
XV. SECURITY
==================================================

GET /security/events
POST /security/report

==================================================
XVI. RULES BẮT BUỘC CHO API
==================================================

- Mọi request phải có workspace_id
- RBAC enforced ở backend
- Rate limit per user và per workspace
- Log mọi hành vi export
- Validate input chặt
- Không trả dữ liệu vượt quyền plan
- Field-level filtering
- Mask dữ liệu nếu cần
- Không expose source nếu plan thấp
- Audit log mọi hành động quan trọng

==================================================
XVII. RESPONSE FORMAT
==================================================

{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

==================================================
XVIII. ERROR FORMAT
==================================================

{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access denied"
  }
}
