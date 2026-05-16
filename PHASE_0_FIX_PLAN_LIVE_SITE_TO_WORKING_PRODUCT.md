# PHASE_0_FIX_PLAN_LIVE_SITE_TO_WORKING_PRODUCT

Khoa rieng 7 ngay bien cios.iai.one tu shell loi API thanh san pham dung duoc

## 1. Muc tieu phase 0

Muc tieu 7 ngay dau khong phai them nhieu tinh nang.

Muc tieu la:

- Xoa trang thai "API unavailable"
- Xoa cam giac demo rong
- Noi duoc bootstrap that
- Lam it nhat 5 module chay duoc bang du lieu that
- Lam realtime toi thieu co ich
- Tao duoc trai nghiem user dau tien dung duoc

## 2. Dinh nghia "working product" sau phase 0

Can dat duoc:

- User dang nhap duoc
- Bootstrap tra ve user + workspace + role + permissions
- Homepage/app overview load duoc du lieu that
- CRM organization list load duoc
- CRM organization detail dau tien load duoc
- Compliance policies load duoc
- Audit log load duoc
- Retention rules load duoc
- Discovery queue load duoc
- Governance decisions load duoc
- Co realtime toi thieu cho notifications hoac review queue
- Khong con text "dang tai..." treo vo han o module chinh

## 3. Pham vi phase 0

Khong lam:

- AI enrichment sau
- Full semantic search
- Native apps
- Token utility
- Full crypto economy
- Robot mesh
- Yield wallet
- Full viral loops

## 4. 7 ngay thuc hien

Day 1 - Bootstrap and Auth Truth

- /v1/meta
- /v1/bootstrap
- session validation
- workspace resolution
- role/permission context
- feature flags
- modules available

Day 2 - CRM Read Surfaces

- /v1/crm/organizations
- /v1/crm/organizations/:id
- response contracts
- pagination
- source summary
- score summary
- compliance status
- suggested actions summary

Day 3 - Compliance Read Surfaces

- /v1/compliance/policies
- /v1/compliance/audit
- /v1/compliance/retention-rules
- policy summary cards
- audit table
- retention table

Day 4 - Source and Governance Read Surfaces

- /v1/sources/discovery-queue
- /v1/sources/governance-decisions
- queue counts
- governance decision list
- latest decision summaries

Day 5 - Realtime Minimum Useful Layer

- SSE first
- notification stream
- review queue updates
- workflow/job failure updates
- API connectivity state

Day 6 - Constitutional and Review States

- action states: allow / deny / review_required
- policy reason codes
- UI button disabled states
- review queue item creation and display
- constitutional mode flag in bootstrap/policies

Day 7 - Homepage and Product Truth

- homepage moi
- current status strip
- product narrative dung
- links vao app/docs/charter/sprint
- bo loading placeholders khoi homepage narrative
- final QA end-to-end

## 5. API uu tien bat buoc

- GET /v1/meta
- GET /v1/bootstrap
- GET /v1/crm/organizations
- GET /v1/crm/organizations/:id
- GET /v1/compliance/policies
- GET /v1/compliance/audit
- GET /v1/compliance/retention-rules
- GET /v1/sources/discovery-queue
- GET /v1/sources/governance-decisions
- GET /health
- GET /health/db

## 6. Realtime toi thieu phai co

- session invalidation notice
- review queue created
- workflow/job failure alert
- source job completed
- decision updated

Neu realtime chet, app van dung duoc voi banner:
Live updates temporarily unavailable

## 7. Frontend fix bat buoc

- Khong treo loading vo han
- Co empty state that
- Co API unavailable state that
- Co degraded mode state that
- Moi module dung cung response envelope

## 8. QA checklist cuoi phase 0

- Mo site khong can doan day la gi
- Login hoac session bootstrap hoat dong
- Menu dung theo role
- Overview khong rong
- CRM co du lieu that
- Compliance co du lieu that
- Audit va retention doc duoc
- Discovery queue doc duoc
- Governance decisions doc duoc
- Realtime toi thieu co ich
- Action bi chan hien thi ly do ro
- Khong con "dang tai..." vo tan o vung chinh

## 9. Deliverables phase 0

- stable bootstrap contract
- working CRM read modules
- working compliance read modules
- working source/governance read modules
- minimum SSE channel
- constitutional/review-required UI states
- production homepage rewrite
- QA checklist signed

## 10. Message chot gui DEV

Phase 0 is not about adding more features. It is about turning the current live shell into a usable product. The app must stop feeling like a technical preview with broken modules and start behaving like a real operating system front. Prioritize bootstrap truth, CRM read surfaces, compliance read surfaces, source governance read surfaces, minimum useful realtime, constitutional review states, and a rewritten homepage. Remove endless loading placeholders from the user experience. A beautiful shell with unavailable APIs has zero product value. A narrower but working product has real value immediately.

## 11. Implementation status (current)

Da bat dau Day 1 va khoa contract can thiet:

- `GET /v1/bootstrap`: da co contract user/workspace/role/permissions/nav/modules/context.
- `GET /v1/overview`: da co snapshot tong hop CRM/compliance/discovery/decision/realtime/status.

Da co test contract:

- `tests/bootstrap-overview.test.ts`

Tiep theo de chot Day 1-2:

- Noi `site/js/app.js` (hoac `/app`) vao `/v1/bootstrap` de dung context that thay vi hardcode.
- Pagination contract cho `/v1/crm/organizations` da co (`page`, `page_size`, `total`) + test contract.

Day 3-4 update:

- `GET /v1/compliance/audit` da co (giu alias `/v1/compliance/audit-log` de backward compatibility).
- `GET /v1/sources/discovery-queue` da co.
- `GET /v1/sources/governance-decisions` da co.
- Da bo sung `summary` cho compliance/discovery/governance read surfaces.

Day 5 update:

- Them `GET /realtime/events/recent` (auth + permission guarded) de app co fallback feed khi stream gap van de.
- Them `POST /v1/sources/discovery-queue` de phat event `source.job.completed` cho realtime minimum useful layer.
- Da bo sung test `tests/phase0-realtime-minimum.test.ts`.

Day 6 update:

- Da bo sung reason code catalog tu CEE va expose qua bootstrap/overview contract.
- Da bo sung UI-state contract gom `disabledStates` va `reviewStates` de frontend map nut disable/review-required ro rang.
- Da bo sung flag `constitutionalReviewEnabled` trong status contract.
- Da bo sung test `tests/phase0-constitutional-ui-states.test.ts`.
