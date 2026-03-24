# FILE: DEV_MASTER_SPEC__CUSTOMER_INTELLIGENCE_OS.md

# CUSTOMER INTELLIGENCE OS
Hệ CRM + Public Data Intelligence + AI Automation
Phiên bản: DEV MASTER SPEC v1
Mục tiêu: Build web + app có khả năng tự chạy mỗi ngày, xử lý dữ liệu công khai hợp pháp, phân tích bằng AI, phục vụ CRM và automation cho doanh nghiệp theo nhiều gói member.

==================================================
I. MỤC TIÊU CỐT LÕI
==================================================

Xây một hệ thống giúp doanh nghiệp:

1. Tự động phát hiện nguồn dữ liệu công khai mới mỗi ngày
2. Tự động crawl các nguồn được phép
3. Chuẩn hóa dữ liệu thành hồ sơ doanh nghiệp và khách hàng
4. Dùng AI để phân tích nhu cầu, tín hiệu tăng trưởng, độ phù hợp
5. Đưa toàn bộ vào CRM để sales và quản lý dùng được ngay
6. Tự động hóa nhắc việc, scoring, routing, review
7. Chia quyền xem theo nhiều gói member
8. Có compliance by design ngay từ kiến trúc
9. Không đi theo hướng scrape bừa bãi, spam, hay thu thập trái phép

ĐỊNH VỊ SẢN PHẨM:
Đây không phải scraper tool.
Đây là Customer Intelligence OS.
Đây là Public Data CRM.
Đây là Compliance First Growth System.

==================================================
II. NGUYÊN TẮC PHÁP LÝ VÀ RANH GIỚI BẮT BUỘC
==================================================

Hệ thống chỉ được phép xử lý dữ liệu công khai có thể truy cập hợp pháp.
Tất cả code phải bám theo nguyên tắc này.

CHO PHÉP:
- Website doanh nghiệp công khai
- Trang liên hệ công khai
- Hồ sơ công ty công khai
- Fanpage doanh nghiệp công khai
- LinkedIn company page công khai
- Nội dung tuyển dụng công khai
- Blog, landing page, case study, footer, metadata công khai
- Registry doanh nghiệp công khai theo nguồn được phép

CẤM TUYỆT ĐỐI:
- Crawl nội dung yêu cầu đăng nhập
- Crawl nội dung bị chặn rõ ràng
- Bypass captcha
- Bypass paywall
- Giả lập người dùng để vượt giới hạn trái phép
- Thu thập email cá nhân bị ẩn
- Thu thập số điện thoại riêng tư không công khai
- Thu thập dữ liệu trẻ em, dữ liệu nhạy cảm, dữ liệu riêng tư
- Tự động outreach hàng loạt không có lớp kiểm tra compliance
- Tự động export mass data cho mọi user
- Thiết kế hệ theo logic “có là lấy”

BẮT BUỘC PHẢI CÓ:
- Privacy Policy
- Terms of Use
- Data Source Policy
- Suppression List
- Deletion Request
- Right to Object
- Audit Logs
- Retention Rules
- Source Lineage
- Robots Compliance Check
- Review Queue cho trường hợp rủi ro

==================================================
III. TẦM NHÌN KIẾN TRÚC
==================================================

Kiến trúc gồm 8 lớp:

1. Source Discovery Layer
2. Crawl Governance Layer
3. Ingestion Layer
4. Normalization Layer
5. Identity Resolution Layer
6. AI Enrichment and Scoring Layer
7. CRM and Workflow Layer
8. Compliance and Audit Layer

Luồng tổng thể:

Discovery
-> Policy Check
-> Crawl Queue
-> Parser
-> Normalizer
-> Entity Resolver
-> AI Enrichment
-> Lead Scoring
-> CRM Objects
-> Workflow Engine
-> Member Views
-> Audit and Retention

==================================================
IV. KIẾN TRÚC MODULE CHÍNH
==================================================

A. SOURCE DISCOVERY ENGINE

Chức năng:
- Phát hiện domain mới
- Phát hiện công ty mới
- Phát hiện nguồn công khai có tín hiệu tăng trưởng
- Đưa nguồn vào hàng đợi chờ review hoặc crawl

Input:
- Seed domains
- Search keywords
- Industry dictionaries
- Geographic filters
- Registry lists công khai

Output:
- Source candidates
- Domain profile
- Risk level
- Crawl eligibility

LƯU Ý CODE:
- Không được auto crawl ngay mọi source mới
- Source mới phải đi qua domain policy checker
- Mọi source phải có source_type, source_url, first_seen_at
- Cần có risk score ban đầu
- Cần hash domain chuẩn hóa để tránh trùng

B. CRAWL GOVERNANCE ENGINE

Chức năng:
- Kiểm tra robots.txt
- Kiểm tra domain allow or deny
- Kiểm tra crawl delay
- Kiểm tra rule nội bộ
- Áp rate limit theo domain
- Chặn các domain bị blacklist
- Buộc user agent rõ ràng

Output:
- allow
- allow_limited
- manual_review
- deny

LƯU Ý CODE:
- Tuyệt đối không hardcode “bỏ qua robots”
- Không code bypass captcha
- Không code headless stealth để lách bảo vệ trái phép
- Mọi lần crawl phải ghi log policy decision
- Domain policy phải cache theo TTL
- Nếu robots fetch lỗi thì không được mặc định allow toàn phần
- Phải có circuit breaker cho domain lỗi liên tiếp

C. INGESTION PIPELINE

Chức năng:
- Tải HTML trang công khai
- Trích xuất metadata
- Trích xuất thông tin liên hệ công khai
- Trích xuất nội dung mô tả doanh nghiệp
- Trích xuất tín hiệu tuyển dụng
- Trích xuất social links
- Trích xuất structured data

LƯU Ý CODE:
- Chỉ lưu dữ liệu cần thiết
- Không lưu full raw HTML vô hạn
- Raw cache phải có TTL
- Trường nào được trích xuất phải kèm source_url
- Nếu confidence thấp thì đưa review queue
- Parser phải chống lỗi encoding
- Parser không được làm crash toàn pipeline khi 1 field sai
- Mọi extraction phải có field confidence

D. NORMALIZATION ENGINE

Chức năng:
- Chuẩn hóa tên công ty
- Chuẩn hóa domain
- Chuẩn hóa email công khai
- Chuẩn hóa số điện thoại công khai
- Chuẩn hóa địa chỉ
- Chuẩn hóa social handles
- Chuẩn hóa ngành nghề

LƯU Ý CODE:
- Không ghi đè dữ liệu gốc
- Luôn có raw_value và normalized_value
- Không merge email cá nhân với email doanh nghiệp
- Không suy diễn quá mức từ text mơ hồ
- Normalize phải idempotent
- Có version cho normalization rules

E. IDENTITY RESOLUTION ENGINE

Chức năng:
- Gộp trùng công ty
- Gộp trùng contact
- Map brand_name và legal_name
- Gắn multi-domain nếu hợp lý
- Phân biệt company với branch với franchise

LƯU Ý CODE:
- Không auto merge khi confidence thấp
- Merge phải reversible
- Mọi quyết định merge phải log
- Có manual override
- Không được mất lineage sau merge
- Phải lưu matched_by_signals

F. AI ENRICHMENT ENGINE

Chức năng:
- Phân loại ngành
- Ước lượng quy mô
- Tóm tắt công ty
- Ước lượng sales maturity
- Ước lượng marketing maturity
- Tìm need signals
- Gợi ý next action
- ICP match scoring

LƯU Ý CODE:
- AI output không được ghi đè dữ liệu nguồn
- AI phải nằm ở lớp derived data
- Mọi AI result phải có model_version
- Có confidence và explanation
- Không cho AI tự ý tạo contact info không tồn tại
- Nếu AI hallucination risk cao phải khóa field
- AI summary phải phân biệt clearly inferred vs source-backed
- Không dùng AI để tạo suy luận nhạy cảm về cá nhân

G. LEAD SCORING ENGINE

Gồm:
- fit_score
- intent_score
- timing_score
- compliance_score
- priority_score

LƯU Ý CODE:
- Score phải explainable
- Không chỉ lưu score cuối
- Phải lưu feature contributions
- Có thể recompute lại theo model_version mới
- Không để score thay đổi không trace được
- Compliance score phải là lớp chặn trước outreach

H. CRM CORE

Objects:
- Organization
- Contact
- Lead
- Opportunity
- Activity
- Note
- Task
- Pipeline
- SourceRecord
- ConsentRecord
- SuppressionRecord
- AuditRecord

LƯU Ý CODE:
- CRM không được tách khỏi source lineage
- Record hiển thị ra ngoài phải biết đến từ đâu
- Mỗi field quan trọng phải truy ngược được nguồn
- Không cho xóa cứng bừa bãi
- Dùng soft delete + scheduled purge
- Mọi update quan trọng phải có updated_by

I. WORKFLOW ENGINE

Workflow:
- crawl daily
- recrawl stale records
- recompute scores
- alert hot leads
- assign owner
- create follow-up tasks
- send review requests
- sync CRM objects
- refresh dashboards
- sync suppression list

LƯU Ý CODE:
- Không cho workflow outreach chạy thẳng không qua compliance gate
- Không cho workflow export mass data không kiểm quyền
- Có retry policy
- Có dead letter queue
- Có idempotency key
- Có workflow run log
- Có manual stop
- Có emergency kill switch

J. COMPLIANCE CONSOLE

Chức năng:
- Xem nguồn từng field
- Xem legal basis tag
- Xem retention countdown
- Xem audit logs
- Xử lý request xóa
- Xử lý object marketing
- Quản suppression
- Quản source risk
- Quản export risk

LƯU Ý CODE:
- Compliance console phải tách quyền riêng
- Không user thường nào cũng xem được
- Deletion request phải tạo ticket và log đầy đủ
- Suppression phải được kiểm trước mọi outreach
- Không được hard delete suppression record

==================================================
V. CƠ CHẾ TỰ CHẠY MỖI NGÀY
==================================================

Daily schedule đề xuất:

00:30 discovery
01:00 policy checks
02:00 crawl allowed sources
04:00 parse and normalize
05:00 entity resolution
06:00 AI enrichment
07:00 scoring
08:00 CRM sync
08:30 dashboard refresh
09:00 alerts
12:00 hot account delta refresh
17:00 review queue push
23:00 retention cleanup and suppression sync

LƯU Ý CODE:
- Mỗi job phải độc lập
- Job fail không được làm sập cả pipeline
- Có retry giới hạn
- Có alert khi fail liên tiếp
- Có metrics per job
- Có execution logs
- Mọi cron jobs phải idempotent
- Không recrawl vô hạn cùng 1 domain trong ngày

==================================================
VI. GÓI MEMBER
==================================================

1. FREE
- 50 records view mỗi tháng
- 1 workspace
- 1 user
- basic dashboard
- basic search
- layer 1 data only
- no export
- no advanced AI
- no automation

2. STARTER
- 2,000 records view mỗi tháng
- 3 users
- basic CRM
- limited enrichment
- limited workflows
- limited CSV export
- AI draft support
- saved views cơ bản

3. GROWTH
- 20,000 records view mỗi tháng
- 10 users
- full CRM
- lead scoring
- AI company summary
- signal alerts
- routing rules
- scheduled refresh
- compliance safe filters

4. PRO
- 100,000 records view mỗi tháng
- 30 users
- advanced enrichment
- advanced workflows
- compliance console
- approval flows
- advanced exports
- audit visibility
- API access

5. ENTERPRISE
- custom limits
- SSO
- private deployment option
- custom sources
- custom scoring
- dedicated region
- advanced governance
- DPA package
- full audit and controls

6. DATA ROOM ADD ON
- verified source trace
- proof snapshots
- governance scorecards
- trusted source layers

LƯU Ý CODE:
- Tất cả feature gating phải ở cả frontend và backend
- Không được chỉ ẩn nút ở UI
- Export limits phải check ở backend
- Usage counters phải chuẩn xác theo billing cycle
- Plan rules phải config-driven
- Không hardcode gói trong nhiều file rời rạc

==================================================
VII. 4 LỚP DỮ LIỆU HIỂN THỊ THEO GÓI
==================================================

Layer 1: Public Summary
Layer 2: Operational Insights
Layer 3: AI Recommendations
Layer 4: Compliance and Source Trace

FREE:
- chỉ Layer 1

STARTER:
- Layer 1 + một phần Layer 2

GROWTH:
- tới Layer 3

PRO và ENTERPRISE:
- đủ Layer 4

LƯU Ý CODE:
- Response serializer phải hiểu plan
- Không trả Layer 4 cho plan thấp rồi chỉ ẩn UI
- Field-level access control là bắt buộc
- Export layer phải còn chặt hơn view layer

==================================================
VIII. CẤU TRÚC WEB APP
==================================================

PUBLIC PAGES
- /
- /pricing
- /legal
- /privacy
- /data-sources
- /request-deletion
- /contact
- /security

APP PAGES
- /app/dashboard
- /app/search
- /app/leads
- /app/accounts
- /app/contacts
- /app/pipeline
- /app/tasks
- /app/workflows
- /app/alerts
- /app/reports
- /app/compliance
- /app/settings
- /app/billing
- /app/team
- /app/audit-logs
- /app/source-center
- /app/suppression-center

ADMIN PAGES
- /admin/source-governance
- /admin/crawl-monitor
- /admin/parser-lab
- /admin/model-center
- /admin/retention-policies
- /admin/legal-review
- /admin/abuse-monitor
- /admin/data-quality
- /admin/billing-control

LƯU Ý CODE:
- Route guard đầy đủ
- Không để admin pages lộ public
- Không dựa vào client-side guard duy nhất
- App state phải tách tenant rõ
- URL search params nên hỗ trợ saved filters

==================================================
IX. CẤU TRÚC MOBILE APP
==================================================

MOBILE CHO SALES VÀ MANAGER
- login
- dashboard
- lead alerts
- account detail
- contact timeline
- task inbox
- AI summary
- note input
- approval requests
- push notifications

KHÔNG CHO MOBILE
- crawl config sâu
- mass export
- parser editing
- retention policy editing
- legal settings

LƯU Ý CODE:
- Mobile chỉ nên gọi secure APIs đã qua authorization
- Không cache dữ liệu nhạy cảm quá lâu
- Push payload không được lộ dữ liệu nhạy cảm
- Offline cache phải purge khi logout
- Token refresh phải an toàn

==================================================
X. DATABASE SCHEMA CỐT LÕI
==================================================

CORE TABLES
- workspaces
- workspace_members
- roles
- permissions
- plans
- subscriptions
- usage_counters

- organizations
- contacts
- leads
- opportunities
- pipelines
- pipeline_stages
- activities
- tasks
- notes

- source_records
- source_proofs
- crawl_jobs
- crawl_policies
- domain_policies
- entity_links
- review_queues

- ai_enrichments
- lead_scores
- signal_events
- model_versions

- consent_records
- suppression_list
- deletion_requests
- retention_rules
- legal_basis_records

- exports
- api_keys
- webhooks
- notifications
- audit_logs
- privacy_events
- security_events
- field_lineage

LƯU Ý CODE:
- Tất cả tables phải có created_at, updated_at
- Bảng quan trọng phải có created_by, updated_by khi phù hợp
- Multi-tenant by design
- Không lẫn data giữa tenant
- Index tốt cho search và filters
- Soft delete cho entities chính
- Audit logs append-only
- Suppression và deletion phải được ưu tiên consistency

==================================================
XI. FIELD QUAN TRỌNG
==================================================

organizations
- id
- workspace_id
- legal_name
- brand_name
- normalized_name
- primary_domain
- secondary_domains
- industry
- subindustry
- country
- city
- public_address
- company_size_estimate
- employee_range
- company_summary
- public_contact_email
- public_contact_phone
- linkedin_url
- facebook_url
- youtube_url
- source_confidence
- freshness_score
- legal_basis_tag
- retention_class
- created_at
- updated_at

contacts
- id
- workspace_id
- organization_id
- full_name
- role_title
- public_business_email
- public_business_phone
- linkedin_public_url
- source_url
- source_visibility
- contactability_class
- do_not_contact
- suppression_reason
- legal_basis_tag
- retention_expires_at
- created_at
- updated_at

source_records
- id
- workspace_id
- entity_type
- entity_id
- field_name
- raw_value
- normalized_value
- source_url
- source_title
- source_type
- first_seen_at
- last_seen_at
- crawl_job_id
- proof_hash
- robots_status
- confidence
- created_at

lead_scores
- id
- workspace_id
- lead_id
- fit_score
- intent_score
- timing_score
- compliance_score
- priority_score
- explanation
- model_version
- generated_at

LƯU Ý CODE:
- Không để source_url null cho field có nguồn
- Không overwrite raw_value
- Không để score mà không có model_version
- Không cho xóa lineage khi record update

==================================================
XII. AI ENGINE
==================================================

AI MODULES
1. NER extraction
2. Industry classifier
3. Company summarizer
4. Need signal detector
5. Fit scoring model
6. Timing model
7. Recommendation engine
8. Compliance assist

AI ASSISTANTS
- Research Copilot
- Sales Copilot
- Compliance Copilot
- CRM Copilot
- Executive Reporting Copilot

LƯU Ý CODE:
- Phân biệt source-backed data và AI-inferred data
- Không để AI output được coi là fact gốc
- Luôn lưu prompt template version nếu cần debug
- Có model guardrails
- Có timeout và fallback
- Có cost controls
- Có quota per tenant
- Không cho AI đọc toàn bộ tenant data vô kiểm soát
- Không dùng AI để suy ra thuộc tính nhạy cảm của cá nhân

==================================================
XIII. SEARCH ENGINE
==================================================

Search by:
- company
- domain
- city
- industry
- tech stack
- growth signal
- hiring signal
- score range
- freshness
- compliance safe only

LƯU Ý CODE:
- Search results phải theo plan visibility
- Không full scan toàn bảng
- Dùng indexed search hoặc search engine riêng
- Log search actions ở mức cần thiết
- Có abuse detection cho search scraping nội bộ
- Không để API search bị dùng như dump endpoint

==================================================
XIV. WORKFLOW ENGINE CHI TIẾT
==================================================

Workflow types:
- daily_discovery
- daily_crawl
- stale_refresh
- score_recompute
- hot_lead_alert
- assign_owner
- create_followup_task
- export_review
- suppression_sync
- retention_purge

Mỗi workflow gồm:
- workflow_id
- workflow_type
- tenant_id
- config_json
- status
- started_at
- completed_at
- retries
- last_error
- metrics_json

LƯU Ý CODE:
- Idempotency key là bắt buộc
- Retry phải exponential backoff
- Dead-letter queue cho fail nặng
- Có run history
- Có manual cancel
- Có safety thresholds
- Không để 1 workflow loop vô hạn
- Không cho workflow tự mở rộng phạm vi crawl không giới hạn

==================================================
XV. BILLING VÀ USAGE METERING
==================================================

Metering:
- records_viewed
- records_refreshed
- AI_summaries
- AI_scoring_runs
- exports_count
- workflow_runs
- api_calls
- seats_used
- proof_snapshots

LƯU Ý CODE:
- Usage phải ghi ở backend
- Không tin client counters
- Billing period phải rõ timezone
- Có overage rules
- Có usage reconciliation jobs
- Có audit cho billing disputes
- Không reset usage sai chu kỳ

==================================================
XVI. BẢO MẬT
==================================================

BẮT BUỘC:
- MFA
- RBAC
- secure session handling
- encryption in transit
- encryption at rest
- signed URLs for downloads
- secret rotation
- WAF
- rate limiting
- anomaly detection
- audit logging
- tenant isolation
- export watermarking

LƯU Ý CODE:
- Không hardcode secrets
- Không commit secrets vào repo
- Không log token, password, API keys
- Không log raw personal fields quá mức
- Không cho admin bypass audit
- Không có hidden super-admin đường tắt
- Mọi export phải trace được ai làm
- Session revoke phải hoạt động thật
- CORS chặt chẽ
- File upload phải scan và validate mime

==================================================
XVII. PRIVACY BY DESIGN
==================================================

- Chỉ hiển thị dữ liệu cần thiết
- Mặc định ẩn field nhạy cảm hơn
- Export chỉ khi đủ quyền
- Deletion flow chuẩn
- Suppression flow chuẩn
- Retention cleanup tự động
- Field lineage luôn có
- Complaint handling có SLA

LƯU Ý CODE:
- Deletion không được chỉ xóa UI
- Phải có purge jobs
- Suppression phải checked trong mọi channel
- Retention cleanup phải có dry-run mode
- Không revive record đã suppression nếu chưa review
- Complaint phải khóa outreach liên quan ngay

==================================================
XVIII. UI UX ĐỊNH HƯỚNG
==================================================

TRANG CHỦ
- định vị rõ sản phẩm
- nhấn mạnh minh bạch, AI, compliance, CRM
- pricing rõ
- demo records rõ
- không dùng ngôn ngữ “scrape mọi thứ”

DASHBOARD
- lead mới hôm nay
- hot accounts
- ngành tăng tín hiệu
- nguồn mới được duyệt
- review queue
- alerts compliance

RECORD DETAIL
- profile công ty
- signal timeline
- AI summary
- source trace
- activity timeline
- recommended next action

LƯU Ý CODE:
- Bảng lớn phải filter tốt
- Không nặng vô lý trên mobile
- Skeleton loading
- Không fetch thừa
- Pagination hoặc cursor tốt
- Source trace hiển thị dễ hiểu
- Warning banners khi field là inferred

==================================================
XIX. TÊN THƯƠNG HIỆU GỢI Ý
==================================================

Top hướng mạnh:
- SignalRoot
- ClearSource CRM
- PublicIntel OS
- TruSource AI
- DemandGraph
- TraceCRM
- OriginCRM
- Veriflow CRM
- InsightOrbit
- GrowthTrace

Khuyên chọn:
1. SignalRoot
2. ClearSource CRM
3. PublicIntel OS
4. TruSource AI
5. DemandGraph

Tagline gợi ý:
- Public Data. Real Signals. Better Sales.
- Minh bạch dữ liệu. Chính xác thời điểm. Hiệu quả bán hàng.
- Từ tín hiệu công khai đến tăng trưởng thực.
- Không chỉ lưu khách hàng. Hiểu khách hàng. Kích hoạt đúng lúc.

LƯU Ý CODE:
- Brand domain model nên tách khỏi tenant brand
- Chuẩn bị hỗ trợ white-label nếu đi enterprise
- Thiết kế logo system và design tokens từ đầu

==================================================
XX. ROADMAP BUILD
==================================================

PHASE 1
- auth
- workspace
- plans
- billing foundation
- organizations
- source records
- crawl governance
- basic crawl
- basic CRM
- public pages
- audit base

PHASE 2
- normalization
- identity resolution
- AI summaries
- lead scoring
- search engine
- dashboards
- saved views
- alerts
- mobile base

PHASE 3
- workflow engine
- compliance console
- suppression center
- deletion flows
- export governance
- approval flows
- advanced analytics

PHASE 4
- enterprise SSO
- private deployment mode
- data room
- advanced model center
- regional controls
- custom connectors
- advanced review systems

LƯU Ý CODE:
- Mỗi phase phải ship được
- Không đợi hoàn hảo toàn bộ mới release
- Nhưng phase nào cũng phải đủ compliance tối thiểu
- Không launch crawl mà thiếu audit
- Không launch export mà thiếu permission

==================================================
XXI. ACCEPTANCE CHECKLIST CHO DEV
==================================================

PHÁP LÝ
- [ ] Có privacy page
- [ ] Có terms page
- [ ] Có data source page
- [ ] Có request deletion flow
- [ ] Có object marketing flow
- [ ] Có suppression center
- [ ] Có source lineage
- [ ] Có audit logs
- [ ] Có retention jobs
- [ ] Có robots compliance layer

KỸ THUẬT
- [ ] cron jobs idempotent
- [ ] queue có retry và dead letter
- [ ] parser có test
- [ ] merge engine reversible
- [ ] AI outputs có model version
- [ ] billing metering chính xác
- [ ] backend feature gating đúng
- [ ] field-level access control đúng
- [ ] export có logging
- [ ] tenant isolation tốt

SẢN PHẨM
- [ ] free plan
- [ ] starter
- [ ] growth
- [ ] pro
- [ ] enterprise
- [ ] onboarding flow
- [ ] saved filters
- [ ] scoring explanation
- [ ] source trace UI
- [ ] alerts hoạt động

BẢO MẬT
- [ ] MFA
- [ ] RBAC
- [ ] secrets manager
- [ ] signed download
- [ ] rate limiting
- [ ] session revoke
- [ ] anomaly logging
- [ ] export watermarking
- [ ] secure file handling
- [ ] no sensitive logs

==================================================
XXII. LƯU Ý RẤT RÕ TRONG CODE
==================================================

1. KHÔNG hardcode bypass
Không được viết code bypass robots, bypass captcha, bypass login, bypass hidden fields.

2. KHÔNG để frontend quyết định quyền
Mọi permission quan trọng phải verify ở backend.

3. KHÔNG ghi đè nguồn gốc dữ liệu
Source lineage là bắt buộc, không được mất khi normalize, merge, enrich, update.

4. KHÔNG để AI quyết định như dữ liệu thật
AI chỉ là lớp suy luận, không phải nguồn gốc sự thật.

5. KHÔNG outreach trước compliance
Mọi email, export, sync ra ngoài phải đi qua suppression, permissions, legal checks.

6. KHÔNG log bừa
Không log secrets, token, raw personal fields không cần thiết.

7. KHÔNG xóa cứng vô tội vạ
Dùng soft delete, purge jobs, audit append-only.

8. KHÔNG để crawl loop vô hạn
Rate limit, per-domain caps, retry limits, circuit breaker là bắt buộc.

9. KHÔNG tin client
Billing, usage, permissions, exports đều phải kiểm ở server.

10. KHÔNG lẫn tenant data
Mọi query phải tenant-scoped. Cần test chéo tenant nghiêm ngặt.

11. KHÔNG để export thành data leak tool
Export phải có quyền, có hạn mức, có log, có watermark, có anomaly detection.

12. KHÔNG xem compliance là module phụ
Compliance phải là phần lõi của domain model và workflow.

13. KHÔNG build theo tư duy scraper
Build theo tư duy trusted customer intelligence platform.

14. KHÔNG phát triển tính năng mới mà bỏ qua retention
Mọi field mới, table mới, workflow mới phải gắn retention policy.

15. KHÔNG dùng inferred data cho quyết định nhạy cảm về cá nhân
Chỉ dùng cho B2B context phù hợp, có giải thích, có giới hạn.

==================================================
XXIII. KẾT LUẬN CHO DEV TEAM
==================================================

Mục tiêu cuối không phải là thu thập nhiều nhất.
Mục tiêu cuối là xây một hệ:

- sạch hơn
- đúng hơn
- mới hơn
- minh bạch hơn
- giải thích được
- có thể kiểm tra
- có thể xóa
- có thể mở rộng
- có thể thương mại hóa bền vững

Đây là một CRM thế hệ mới:
Public Data Intelligence
+ AI Enrichment
+ Sales Workflow
+ Compliance by Design
+ Multi-tier Membership

END FILE
