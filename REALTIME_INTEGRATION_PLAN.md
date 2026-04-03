CUSTOMER INTELLIGENCE OPERATING SYSTEM

REALTIME INTEGRATION PLAN

API Gateway to Frontend Shell

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU CỦA FILE NÀY

File này khóa cách nối:
• API Gateway
• backend services
• realtime updates
• frontend shell static/PWA hiện có

Mục tiêu là biến shell hiện tại từ trạng thái:

“đang kiểm tra API realtime…”

thành một app có dữ liệu sống, role-based, có event updates, có trạng thái ingestion, scoring, decisions, compliance và workflow.

==================================================
II. ĐỊNH HƯỚNG TỔNG THỂ

Frontend shell không được gọi trực tiếp vào pipeline nặng.
Shell phải nói chuyện với API Gateway và một lớp realtime channel có kiểm soát.

Mô hình đúng:

Frontend Shell
→ API Gateway
→ App Services
→ Queue / Workers / Events

Realtime path:
Workers / Services / Event Bus
→ Realtime Publisher
→ Frontend Subscribers

==================================================
III. NHỮNG GÌ FRONTEND CẦN NHẬN REALTIME

Không phải mọi thứ đều cần realtime.

3.1 Realtime priority 1
• auth/session invalidation
• notifications
• alerts
• decision status changes
• compliance review queue updates
• workflow dispatch results
• failed jobs needing operator attention

3.2 Realtime priority 2
• crawl job progress
• parse progress
• score refresh completion
• signal detection completion
• report generation completion

3.3 Realtime priority 3
• dashboard counters
• source health summaries
• queue health summaries
• market movement tickers

==================================================
IV. FRONTEND DATA MODEL

Frontend nên chia dữ liệu thành 4 loại:

4.1 Bootstrap data

Dữ liệu cần load lúc app mở:
• user
• workspace
• role
• permissions
• feature flags
• plan entitlements
• nav configuration

4.2 Query data

Dữ liệu load theo trang:
• organizations
• contacts
• leads
• decisions
• compliance items
• workflows
• reports

4.3 Live event data

Dữ liệu update realtime:
• notifications
• action state changes
• job state changes
• queue counters
• approvals

4.4 Derived local UI state
• selected filters
• drawer states
• tab states
• optimistic UI markers
• cached current views

==================================================
V. API GATEWAY CONTRACT CHO FRONTEND

5.1 Gateway responsibilities
• auth validation
• tenant resolution
• role and permission context
• consistent response envelope
• request tracing
• rate limiting
• route aggregation when needed

5.2 Response envelope chuẩn

Mọi response nên có:
• ok
• data
• meta
• error
• request_id
• pagination if needed
• permissions context when useful

5.3 Frontend absolute rule

Frontend không tự suy diễn quyền từ UI.
Frontend chỉ hiển thị dựa trên permission context, nhưng enforcement thật ở backend.

==================================================
VI. REALTIME TRANSPORT STRATEGY

6.1 Recommended order

Phase 1

Server-Sent Events cho notification và lightweight updates

Phase 2

WebSocket cho command center nếu cần hai chiều nhiều hơn

Phase 3

Hybrid:
• SSE cho broadcast status
• WebSocket cho high-interaction operator surfaces

6.2 Vì sao nên bắt đầu bằng SSE
• đơn giản hơn
• dễ debug hơn
• tốt cho stream trạng thái một chiều
• phù hợp dashboard, alerts, job updates, queue counters

==================================================
VII. REALTIME CHANNELS

7.1 Channel families

User-scoped channels
• personal notifications
• task assignments
• approval requests assigned to me

Workspace-scoped channels
• source health updates
• job status changes
• queue counters
• report readiness
• workflow dispatch results

Role-scoped channels
• compliance queue updates
• manager alert summaries
• executive briefing refresh prompts

Object-scoped channels
• decision status for specific decision
• workflow execution updates
• report generation status
• export review item updates

==================================================
VIII. FRONTEND SHELL BOOTSTRAP PLAN

8.1 Boot sequence

App Load
→ Session Check
→ Bootstrap Request
→ Workspace + Role + Permissions
→ Feature Flags
→ Nav Config
→ Initial Overview Data
→ Realtime Connect
→ Subscribe Relevant Channels

8.2 Bootstrap payload nên gồm
• current user
• workspace summary
• role
• permission matrix summary
• enabled modules
• feature flags
• top counters
• pending approvals count
• pending alerts count
• quick links config

8.3 Nếu bootstrap fail

UI phải có:
• session expired state
• no workspace access state
• maintenance state
• degraded mode state

==================================================
IX. PAGE DATA STRATEGY

9.1 Overview page

Load:
• top metrics
• alerts
• decisions summary
• workflow summary
• compliance summary

Subscribe realtime:
• alert count changes
• decision status changes
• failed job alerts
• queue health summaries

9.2 Organization / Contact / Lead pages

Load:
• record detail
• signals
• scores
• source trace
• timeline

Subscribe realtime:
• score refresh complete
• new signal attached
• owner change
• compliance state change

9.3 Compliance pages

Load:
• review queue
• suppression
• deletion requests
• export logs

Subscribe realtime:
• new review item
• review resolution
• risky action attempted
• export denied
• deletion escalation

9.4 Workflow pages

Load:
• workflows
• executions
• failures
• mappings

Subscribe realtime:
• execution updates
• callback received
• failure alerts
• retries complete

==================================================
X. FRONTEND CACHE STRATEGY

10.1 Principles
• query cache for read views
• event-driven invalidation for live changes
• local optimistic markers only for safe actions
• stale-while-revalidate where useful

10.2 Invalidation strategy

Khi nhận live event:
• patch local store nếu object nhỏ
• invalidate page query nếu aggregate changed
• refresh counters if global state changed
• show badge if current view stale

10.3 Must not do
• reload whole app on every event
• open too many sockets per page
• let stale permission context persist after role change

==================================================
XI. REALTIME EVENT SHAPE

Mọi live event nên có shape nhất quán:
• event_type
• workspace_id
• scope_type
• scope_id
• object_type
• object_id
• summary
• severity
• timestamp
• trace_id
• payload_minimal
• action_hint if any

Ví dụ:
• decision.updated
• compliance.review_created
• workflow.execution_failed
• source.job_completed
• score.refresh_completed

==================================================
XII. FRONTEND MODULE INTEGRATION

12.1 App registry

Shell hiện tại nên có module registry rõ:
• overview module
• crm module
• intelligence module
• decision module
• compliance module
• workflow module
• admin module

12.2 Module contract

Mỗi module phải khai báo:
• route
• required permissions
• bootstrap dependencies
• realtime subscriptions
• fallback states
• refresh triggers

12.3 Role-adaptive nav

Nav không hardcode hoàn toàn.
Nav phải đọc:
• enabled modules
• permission context
• plan
• workspace configuration

==================================================
XIII. ERROR AND DEGRADED MODE PLAN

13.1 API degraded mode

Nếu query thường vẫn chạy nhưng realtime chết:
• app phải usable
• hiển thị “live updates unavailable”
• fallback polling ở một số surface quan trọng

13.2 Realtime degraded mode

Nếu SSE/WebSocket lỗi:
• retry backoff
• resume subscriptions
• show connection status
• prevent fake live indicator

13.3 Partial permissions mode

Nếu user không còn quyền:
• disable actions
• refetch permission context
• redirect if needed
• explain why feature disappeared

==================================================
XIV. SECURITY PLAN CHO REALTIME

14.1 Must have
• tenant isolation per channel
• user auth before subscribe
• role validation for channel access
• no sensitive payload over broad workspace channel
• trace every channel subscription
• invalidate channels on logout/session revoke

14.2 Sensitive updates

Các update nhạy cảm như:
• export review
• deletion requests
• compliance overrides
• constitutional denials

không được broadcast rộng quá mức.
Phải scope hẹp theo:
• assigned reviewer
• privileged role
• target workspace group

==================================================
XV. FLOW TỪ API GATEWAY ĐẾN SHELL

15.1 Standard request path

Frontend Shell
→ API Gateway
→ Service
→ DB / Search / Queue
→ Response

15.2 Standard live update path

Worker or Service
→ Event Bus
→ Realtime Publisher
→ Subscribed Frontend Channel
→ Local Cache Update / Badge / Notification

15.3 Action with review_required path

Frontend Action
→ API Gateway
→ Compliance / CEE Check
→ review_required
→ Review Item Created
→ Realtime event to reviewer
→ UI button state updated

==================================================
XVI. IMPLEMENTATION ORDER

Phase 1
• bootstrap endpoint
• session validation
• permission-aware nav
• overview data wired
• query layer stable

Phase 2
• SSE channel for notifications
• review queue live updates
• workflow status live updates
• failed job alerts

Phase 3
• object-scoped live updates
• dashboard counter patching
• decision and compliance live surfaces

Phase 4
• advanced command center
• optional WebSocket upgrade
• richer operator surfaces
• live timeline streams

==================================================
XVII. ABSOLUTE RULES 1. Frontend không gọi trực tiếp worker nặng 2. Frontend không tự quyết định enforcement 3. Realtime chỉ truyền payload tối thiểu cần thiết 4. Không broadcast chéo tenant 5. Không dùng realtime thay thế API truth 6. Realtime lỗi thì app vẫn phải dùng được 7. Permission change phải làm nav và action state cập nhật 8. Không để shell sống mà không có bootstrap contract rõ 9. Không hiển thị “live” khi thực tế đang stale 10. Realtime phải phục vụ hành động, không chỉ trang trí

==================================================
XVIII. ĐỊNH NGHĨA “NỐI ĐÚNG”

API Gateway và Frontend Shell được coi là nối đúng khi:
• app boot nhanh và có context rõ
• role nào thấy đúng role đó
• overview có dữ liệu thật
• actions phản ánh permission và policy thật
• review queues update gần realtime
• workflow và compliance status quay lại UI đúng chỗ
• realtime mất thì app vẫn vận hành được
• tenant isolation không bao giờ bị phá

END FILE
