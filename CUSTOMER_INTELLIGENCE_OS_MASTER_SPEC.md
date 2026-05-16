# FILE: CUSTOMER_INTELLIGENCE_OS_MASTER_SPEC.md

## 1) TÊN DỰ ÁN
Customer Intelligence OS
Nền tảng CRM + Public Data Intelligence + AI Automation cho web và app mobile

---

## 2) MỤC TIÊU HỆ THỐNG

Xây dựng một nền tảng giúp doanh nghiệp:

1. Tự động thu thập dữ liệu công khai hợp pháp mỗi ngày
2. Chuẩn hóa và làm giàu dữ liệu bằng AI
3. Chấm điểm lead và phát hiện tín hiệu nhu cầu
4. Quản trị pipeline bán hàng trong CRM
5. Tự động phân công, nhắc việc, nuôi dưỡng lead
6. Cung cấp nhiều gói member để xem dữ liệu theo quyền hạn
7. Có hệ thống compliance rõ ràng để tránh vi phạm pháp luật

Đây không phải là spam tool.
Đây là hệ điều hành dữ liệu khách hàng công khai và tự động hóa bán hàng hợp pháp.

---

## 3) RANH GIỚI PHÁP LÝ BẮT BUỘC

### 3.1 Chỉ cho phép thu thập
- Dữ liệu hiển thị công khai trên website công khai
- Dữ liệu doanh nghiệp công khai từ cổng thông tin doanh nghiệp
- Trang giới thiệu công ty
- Fanpage doanh nghiệp công khai
- Hồ sơ doanh nghiệp công khai
- Nội dung blog, tuyển dụng, sản phẩm, dịch vụ công khai
- Thông tin liên hệ doanh nghiệp được công khai rõ ràng cho mục đích kinh doanh

### 3.2 Cấm tuyệt đối
- Thu thập dữ liệu riêng tư, không công khai
- Thu thập email cá nhân bị ẩn hoặc phải vượt lớp che giấu
- Thu thập số điện thoại riêng tư không công khai
- Đăng nhập trái phép
- Bypass paywall
- Bypass captcha
- Lấy dữ liệu từ khu vực cấm truy cập
- Lấy dữ liệu trái robots.txt hoặc trái điều khoản truy cập nếu nguồn quy định cấm rõ ràng
- Dùng bot để mạo danh con người
- Gửi email hàng loạt không có cơ chế opt out
- Lưu dữ liệu vượt quá thời gian cần thiết cho mục đích đã khai báo

### 3.3 Bắt buộc có trong sản phẩm
- Privacy Policy
- Terms of Use
- Data Source Policy
- Do Not Collect List
- Suppression List
- Data Deletion Request
- Right to Object
- Audit Logs
- Data Retention Policy
- Consent Ledger cho các hành vi cần đồng ý
- Legitimate Interest Assessment module cho các luồng dùng dữ liệu công khai vào marketing B2B

---

## 4) NGUỒN DỮ LIỆU HỢP PHÁP ƯU TIÊN

### Nguồn nhóm A: Cổng thông tin doanh nghiệp công khai
- National Business Registration Portal
- Các danh mục công khai do doanh nghiệp tự đăng
- Các cổng open data hợp pháp của nhà nước nếu có

### Nguồn nhóm B: Website doanh nghiệp công khai
- Trang chủ
- Trang giới thiệu
- Trang liên hệ
- Trang dịch vụ
- Blog
- Tin tuyển dụng
- Case study
- Chính sách bảo mật
- Footer
- Structured data schema markup

### Nguồn nhóm C: Kênh thương hiệu công khai
- Fanpage doanh nghiệp
- Kênh YouTube
- LinkedIn company page
- Hồ sơ app public
- Google Business Profile nếu được phép theo điều kiện nguồn

### Nguồn nhóm D: Tín hiệu nhu cầu công khai
- Tuyển dụng SDR sales marketing CRM ops
- Ra mắt sản phẩm mới
- Tăng tần suất nội dung quảng bá
- Nâng cấp website
- Mở rộng địa bàn
- Đăng case study tăng trưởng
- Nêu vấn đề vận hành trên blog hoặc social

---

## 5) TRIẾT LÝ DỮ LIỆU

Không gom mọi thứ có thể.
Chỉ lấy những gì:
- Có mục đích rõ
- Có giá trị kinh doanh thật
- Ít xâm phạm nhất
- Có thể giải thích được
- Có thể xóa được
- Có thể chứng minh nguồn gốc

Nguyên tắc chuẩn hóa:
- Source URL
- Source Type
- Source First Seen
- Source Last Seen
- Crawl Permission Status
- Legal Basis Tag
- Confidence Score
- Data Freshness Score
- PII Level
- Retention Class
- Contactability Class

---

## 6) KIẾN TRÚC TỔNG THỂ

### 6.1 7 lớp hệ thống

1. Source Discovery Layer
2. Crawl and Ingestion Layer
3. Normalization and Identity Resolution Layer
4. AI Enrichment and Scoring Layer
5. CRM Core Layer
6. Automation and Outreach Governance Layer
7. Compliance and Audit Layer

### 6.2 Luồng dữ liệu
Discovery -> Crawl Queue -> Parser -> Normalizer -> Entity Resolver -> AI Enrichment -> Lead Scoring -> CRM -> Workflow Engine -> Review or Auto Actions -> Logs -> Member Views

---

## 7) MODULE CHÍNH

### 7.1 Source Discovery Engine
Nhiệm vụ:
- Phát hiện website doanh nghiệp mới
- Phát hiện nguồn mới từ search engine APIs hợp lệ
- Phát hiện tín hiệu tăng trưởng
- Phân loại nguồn theo độ tin cậy

Input:
- Domain seed lists
- Public registries
- Search keywords
- Industry dictionaries
- Geographic filters

Output:
- Source candidates
- Domain profiles
- Crawl permission status
- Discovery score

### 7.2 Crawl Governance Engine
Nhiệm vụ:
- Kiểm tra robots.txt
- Kiểm tra crawl delay nếu có
- Kiểm tra terms hints
- Thiết lập allowlist và denylist
- Rate limiting theo domain
- User agent rõ ràng
- Retry thông minh
- Blackout domains cấm thu thập

Output:
- Allow
- Allow limited
- Manual legal review
- Deny

### 7.3 Ingestion Pipeline
Nhiệm vụ:
- Crawl HTML
- Parse metadata
- Extract visible content
- Extract contact info công khai
- Extract company descriptors
- Extract recruitment signals
- Extract technology signals
- Snapshot nội dung cần thiết

Không lưu toàn bộ trang vô hạn.
Chỉ lưu:
- Trường dữ liệu đã map
- Trích đoạn cần chứng minh
- Hash nội dung
- URL nguồn
- Timestamps
- Screenshot hash nếu bật chế độ proof

### 7.4 Identity Resolution Engine
Nhiệm vụ:
- Gộp trùng doanh nghiệp
- Gộp nhiều website về một entity nếu phù hợp
- Phân biệt brand với legal entity
- Map parent child branch nếu có

Các khóa gộp:
- Domain
- Company name normalized
- Tax ID nếu công khai hợp pháp
- Address similarity
- Public contact overlap
- Social handle overlap

### 7.5 AI Enrichment Engine
Nhiệm vụ:
- Phân ngành
- Ước lượng quy mô
- Ước lượng trưởng thành số
- Phân tích stack công nghệ
- Tín hiệu đang tăng trưởng hay suy giảm
- Tín hiệu có nhu cầu CRM, automation, web, ads, tuyển dụng, AI
- Tóm tắt công ty
- Tạo ICP match score

Output mẫu:
- Industry
- Subindustry
- Region
- Company size estimate
- Sales maturity score
- Marketing maturity score
- Automation readiness score
- Need signals
- Risk notes
- Suggested next action

### 7.6 CRM Core
Objects:
- Account
- Contact
- Lead
- Opportunity
- Activity
- Task
- Pipeline Stage
- Note
- Attachment
- Source Record
- Compliance Record
- Consent Record
- Suppression Record

### 7.7 AI Copilot for Sales
Chức năng:
- Tóm tắt công ty trong 15 giây
- Gợi ý cách tiếp cận phù hợp
- Tạo email B2B an toàn
- Gợi ý câu hỏi discovery call
- Tạo script follow up
- Tóm tắt lịch sử tương tác
- Đề xuất chuyển stage

### 7.8 Workflow Engine
Workflow hợp lệ:
- Crawl daily
- Refresh stale records
- Re-score leads
- Notify sales hot leads
- Assign owner
- Create tasks
- Sync to email tools
- Queue human review
- Export approved audiences
- Auto suppress contacts đã opt out

Workflow bị cấm:
- Auto scrape private sources
- Auto outreach không kiểm soát
- Auto mail hàng loạt không compliance check
- Auto profile people ở mức nhạy cảm

### 7.9 Compliance Console
Chức năng:
- Xem nguồn từng field
- Xem legal basis của từng record
- Xem lý do lưu dữ liệu
- Xem retention countdown
- Xử lý yêu cầu xóa
- Xử lý phản đối marketing
- Xem lịch sử truy cập dữ liệu
- Audit ai đã export dữ liệu
- Data lineage

---

## 8) CƠ CHẾ TỰ CHẠY MỖI NGÀY

### 8.1 Daily Jobs
00:30 Domain discovery
01:00 Robots and policy checks
02:00 Crawl allowed sources
04:00 Parse and normalize
05:00 Resolve entities
06:00 AI enrichment and scoring
07:00 Compliance validation
08:00 CRM sync
08:30 Member dashboards refresh
09:00 Sales alerts
12:00 Delta refresh for hot accounts
17:00 Outreach review queue
23:00 Retention cleanup and suppression sync

### 8.2 Weekly Jobs
- Recompute scoring models
- Reclassify industries
- Review blocked domains
- Dedupe global entities
- Generate executive reports

### 8.3 Monthly Jobs
- Retention purge
- Legal review sample
- Accuracy review
- False positive review
- Model calibration

---

## 9) GÓI MEMBER

### 9.1 FREE
Dành cho thử nghiệm
- 50 records view mỗi tháng
- 1 workspace
- 1 user
- Basic CRM
- Basic search
- Không export
- Không AI enrichment sâu
- Không automation

### 9.2 STARTER
Dành cho cá nhân và nhóm nhỏ
- 2,000 records view mỗi tháng
- 3 users
- Public data search
- Basic enrichment
- 3 pipelines
- 5 workflows
- Daily refresh giới hạn
- CSV export giới hạn
- Email draft AI

### 9.3 GROWTH
Dành cho SME
- 20,000 records view mỗi tháng
- 10 users
- Full CRM
- Lead scoring
- AI company summary
- Need signal alerts
- Scheduled refresh
- API access cơ bản
- Zalo email webhook integration
- Role permissions

### 9.4 PRO
Dành cho sales team và agency
- 100,000 records view mỗi tháng
- 30 users
- Deeper enrichment
- Intent dashboards
- Multi pipeline
- Team routing
- Compliance console
- Approval flows
- Advanced exports
- Connectors
- SLA support

### 9.5 ENTERPRISE
Dành cho tập đoàn
- Không giới hạn hợp đồng
- Private deployment hoặc dedicated region
- Custom sources
- Custom models
- Audit and legal modules
- Data residency options
- SSO
- Fine grained permissions
- DPA and security package
- Human review team workflows

### 9.6 DATA ROOM ADD ON
Gói cao cấp riêng
- Verified source chains
- Proof snapshots
- High trust records
- Audit package
- Governance scorecards

---

## 10) QUYỀN XEM THEO GÓI

### Mỗi record có 4 lớp hiển thị
Layer 1 Public Summary
Layer 2 Operational Insights
Layer 3 AI Recommendations
Layer 4 Compliance and Source Trace

FREE chỉ thấy Layer 1
STARTER thấy Layer 1 và một phần Layer 2
GROWTH thấy tới Layer 3
PRO và ENTERPRISE thấy đủ Layer 4

---

## 11) WEB APP CẤU TRÚC TRANG

/public
- homepage
- pricing
- legal
- privacy
- data sources
- request deletion
- contact sales

/app
- dashboard
- search
- leads
- accounts
- contacts
- pipeline
- tasks
- workflows
- alerts
- reports
- compliance
- settings
- billing
- team
- audit-logs
- source-center
- suppression-center

/admin
- source-governance
- crawl-monitor
- parser-lab
- model-center
- retention-policies
- legal-review
- abuse-monitor
- data-quality
- billing-control

---

## 12) MOBILE APP CẤU TRÚC

### Dành cho sales và manager
- Login
- Dashboard
- Lead alerts
- Accounts
- Contact timeline
- Task inbox
- AI summary
- Notes dictation
- Quick follow up
- Approval requests
- Notifications
- Offline cache cơ bản

### Không cho mobile app
- Crawl setup phức tạp
- Bulk export
- Legal config sâu
- Parser editing

---

## 13) DATABASE THỰC THI

### Bảng cốt lõi
organizations
contacts
leads
opportunities
pipelines
pipeline_stages
activities
tasks
notes
source_records
crawl_jobs
crawl_policies
domain_policies
entity_links
ai_enrichments
lead_scores
signal_events
exports
suppression_list
consent_records
deletion_requests
retention_rules
audit_logs
workspace_members
roles
permissions
plans
subscriptions
usage_counters
api_keys
webhooks
notifications

### Bảng đặc biệt
legal_basis_records
source_proofs
review_queues
model_versions
field_lineage
privacy_events
security_events

---

## 14) THIẾT KẾ FIELD QUAN TRỌNG

### organizations
id
workspace_id
legal_name
brand_name
normalized_name
domain_primary
domains_secondary
industry
subindustry
country
city
address_public
size_estimate
employee_range
company_summary
value_proposition
public_contact_email
public_contact_phone
linkedin_url
facebook_url
youtube_url
source_confidence
freshness_score
legal_basis_tag
retention_class
created_at
updated_at

### contacts
id
organization_id
full_name
role_title
public_business_email
public_business_phone
linkedin_public_url
contactability_class
source_url
source_visibility
do_not_contact
suppression_reason
legal_basis_tag
retention_expires_at

### source_records
id
entity_type
entity_id
field_name
field_value
source_url
source_title
first_seen_at
last_seen_at
crawl_job_id
proof_hash
robots_status
terms_review_status
confidence

### lead_scores
id
lead_id
fit_score
intent_score
timing_score
engagement_score
compliance_score
priority_score
explanation
model_version
generated_at

---

## 15) AI CHẤM ĐIỂM

### 15.1 Fit Score
Đo mức phù hợp với ICP
Dựa trên:
- ngành
- quy mô
- địa lý
- ngôn ngữ
- mức trưởng thành số

### 15.2 Intent Score
Đo tín hiệu có nhu cầu
Dựa trên:
- tuyển dụng
- tăng trưởng nội dung
- nâng cấp web
- mở rộng đội sales
- ra mắt sản phẩm mới
- nội dung mô tả vấn đề vận hành

### 15.3 Timing Score
Đo mức phù hợp thời điểm
Dựa trên:
- mới cập nhật site
- tin công khai gần đây
- nhịp độ thay đổi 7 ngày 30 ngày 90 ngày

### 15.4 Compliance Score
Đo độ an toàn khi dùng dữ liệu
Dựa trên:
- nguồn
- field sensitivity
- robots
- visibility
- data age
- opt out status

### 15.5 Priority Score
Tổng điểm gợi ý sales nên xử lý trước

---

## 16) CÁC CÔNG CỤ AI TÍCH HỢP

### AI Model Types
- NER model để trích xuất thực thể
- LLM để tóm tắt và gợi ý
- Classifier để phân ngành
- Rules engine để compliance gating
- Ranking model để lead scoring
- Forecast model để churn hoặc win probability

### AI Assistants
- Research Copilot
- Sales Copilot
- Compliance Copilot
- CRM Copilot
- Executive Reporting Copilot

---

## 17) TÍCH HỢP HỆ SINH THÁI

### Inbound
- Search APIs hợp lệ
- Public registry feeds
- RSS feeds
- Company websites
- Form captures
- Ads lead forms
- CRM imports

### Outbound
- Email platforms
- Zalo OA workflows
- Slack or Teams
- Call center tools
- Calendar
- Internal BI

### Internal
- Billing
- Identity
- Feature flags
- Audit warehouse
- Vector search
- Queue system

---

## 18) COMPLIANCE BY DESIGN

### 18.1 Privacy by default
- Chỉ hiển thị field cần thiết
- Field nhạy cảm mặc định ẩn
- Export mặc định hạn chế
- Log mọi hành vi export
- Không cho bulk actions nếu chưa đủ quyền

### 18.2 Retention rules
- Raw crawl cache: 7 đến 30 ngày
- Parsed public data: 90 đến 365 ngày theo loại
- Suppression records: lưu dài hơn để tránh liên hệ lại
- Audit logs: 12 đến 36 tháng hoặc theo hợp đồng
- Deleted records: xóa logic rồi purge vật lý theo lịch

### 18.3 Rights handling
- Request access
- Request correction
- Request deletion
- Request objection
- Request restriction
- Source challenge flow

### 18.4 Human review triggers
- Contact info ambiguity
- Personal profile data
- High volume export
- New source type
- Cross border processing
- AI confidence thấp
- Complaint or opt out

---

## 19) QUY TẮC OUTREACH HỢP PHÁP

### Chỉ cho phép gửi khi
- Có consent rõ ràng
hoặc
- Có căn cứ hợp pháp cho B2B direct marketing theo khu vực áp dụng
và
- Message có tính liên quan
- Có thông tin người gửi minh bạch
- Có cơ chế opt out rõ ràng
- Tần suất hợp lý
- Không dùng dữ liệu bị che giấu hay lấy trái phép

### Cấm
- Cold spam hàng loạt không kiểm soát
- Gửi tự động chỉ vì có email công khai
- Dùng AI để ngụy tạo mối quan hệ
- Gửi cho email cá nhân nếu nguồn và căn cứ không phù hợp

---

## 20) BỘ CHỈ SỐ HỆ THỐNG

### Product KPIs
- Records discovered per day
- Valid records ratio
- Freshness ratio
- Dedupe accuracy
- AI enrichment coverage
- Signal precision
- CRM adoption
- Workflow completion
- Member conversion
- Retention by plan

### Compliance KPIs
- Robots compliance rate
- Manual review rate
- Complaint rate
- Opt out response time
- Deletion SLA
- High risk source ratio
- Export anomaly rate

### Revenue KPIs
- ARPU
- Expansion revenue
- Paid conversion
- CAC to LTV
- Seat growth
- Data room attach rate

---

## 21) STACK KỸ THUẬT ĐỀ XUẤT

### Frontend Web
- Next.js hoặc React app router
- Tailwind hoặc custom design system
- TanStack Query
- i18n sẵn

### Mobile
- React Native hoặc Flutter
- Push notifications
- Secure local storage

### Backend
- Node.js API
- Python workers cho parsing và AI
- Queue based architecture

### Data
- PostgreSQL
- Redis
- Object storage
- Vector DB nếu cần semantic search

### Infra
- Cloudflare hoặc AWS tùy quy mô
- Workers cho edge tasks
- Queues
- Cron jobs
- WAF
- Rate limiting
- Secrets manager

### Search
- OpenSearch hoặc Typesense hoặc Meilisearch

### Observability
- Sentry
- OpenTelemetry
- Structured logs
- Audit warehouse

---

## 22) PHÂN QUYỀN

Roles:
- Owner
- Admin
- Compliance Admin
- Sales Manager
- Sales Rep
- Analyst
- Reviewer
- Finance
- Support
- Read only

### Quyền nhạy cảm cần tách riêng
- Export data
- View source trace
- Manage suppression
- Approve workflows
- Change retention
- Access compliance console
- Configure crawlers
- Create API keys

---

## 23) HỆ THỐNG BILLING

### Metering
- Records viewed
- Records refreshed
- AI summaries
- AI scoring runs
- Exports
- Workflow runs
- API calls
- Team seats
- Proof snapshots

### Monetization
- Monthly SaaS
- Annual SaaS
- Data room add on
- Premium integrations
- Enterprise deployment
- Private region
- Custom models
- Verified dataset packs

---

## 24) BẢO MẬT

- SSO enterprise
- MFA
- RBAC
- IP allowlist cho admin
- Device session control
- Encryption in transit
- Encryption at rest
- Per tenant isolation
- Export watermarking
- Anomaly detection
- Signed URLs cho downloads
- Secret rotation
- Audit everywhere

---

## 25) UX TỐI ƯU

### Dashboard 1
- Hôm nay có bao nhiêu lead mới
- Bao nhiêu hot accounts
- Nguồn nào tăng mạnh
- Có gì cần duyệt
- Có yêu cầu xóa hoặc phản đối nào

### Dashboard 2
- Theo ngành
- Theo địa phương
- Theo tín hiệu nhu cầu
- Theo trạng thái pipeline
- Theo thành viên đội sales

### Search Experience
- Search by company
- Search by domain
- Search by need signal
- Search by industry
- Search by city
- Search by tech stack
- Search by growth event
- Search by compliance safe filter

---

## 26) TÊN THƯƠNG HIỆU GỢI Ý

### Nhóm 1: Sang, dễ mở rộng quốc tế
- Vistara CRM
- Verisium
- Leadvora
- Datanest
- Clientory
- Signalium
- OrbitCRM
- Nexora Data
- Lumera CRM
- TruSource AI

### Nhóm 2: Mạnh về tín hiệu và AI
- SignalRoot
- IntentFlow
- LeadSignal OS
- DemandGraph
- InsightOrbit
- ProspectGraph
- SenseLead
- NeedPulse
- MarketSignal AI
- GrowthTrace

### Nhóm 3: Mạnh về tin cậy và compliance
- ClearSource CRM
- ProofLead
- TrustGraph CRM
- OriginCRM
- Veriflow CRM
- CompliLead
- OpenSignal CRM
- PublicIntel OS
- SourceLedger
- TraceCRM

### Nhóm 4: Hợp cho Việt Nam và quốc tế
- NguonMo
- MinhBach CRM
- CongKhai AI
- KhachHangOS
- TruongTin CRM
- VietSignal
- KhaiNguon Data
- BanDoKhachHang
- DoanhNghiepGraph
- HanhTrinhCRM

### Hướng chọn tên tốt nhất
Ưu tiên tên:
- 2 đến 4 âm tiết
- đọc tốt bằng tiếng Anh
- có thể gắn thêm AI hoặc OS
- không quá hẹp vào “scraping”
- gợi giá trị minh bạch, tín hiệu, tăng trưởng

### Top đề xuất mạnh nhất
1. SignalRoot
2. ClearSource CRM
3. PublicIntel OS
4. TruSource AI
5. DemandGraph

---

## 27) GỢI Ý ĐỊNH VỊ THƯƠNG HIỆU

### Định vị 1
CRM thông minh cho dữ liệu khách hàng công khai và tín hiệu nhu cầu thật

### Định vị 2
Nền tảng customer intelligence vận hành hợp pháp, minh bạch, có kiểm soát

### Định vị 3
Từ dữ liệu công khai đến hành động bán hàng đúng thời điểm

### Định vị 4
Không chỉ lưu khách hàng. Hiểu khách hàng. Kích hoạt đúng lúc.

### Tagline gợi ý
- Public Data. Real Signals. Better Sales.
- Minh bạch dữ liệu. Chính xác thời điểm. Hiệu quả bán hàng.
- Từ tín hiệu công khai đến tăng trưởng thực.
- CRM thông minh cho doanh nghiệp hiện đại.

---

## 28) GIAO DIỆN THƯƠNG HIỆU

Tone:
- chuyên nghiệp
- minh bạch
- thông minh
- an toàn
- enterprise ready

Màu:
- xanh đậm than + trắng + điểm nhấn xanh ngọc
hoặc
- graphite + electric blue
hoặc
- deep green + silver

Phong cách UI:
- sạch
- rõ
- dữ liệu lớn nhưng không rối
- thẻ thông tin có source trace
- biểu đồ tín hiệu
- bảng record rất mạnh filter

---

## 29) ROADMAP TRIỂN KHAI

### Phase 1: Foundation 30 ngày
- Auth
- Workspace
- Organizations
- Leads
- Source center
- Basic crawl
- Basic enrichment
- Dashboard
- Pricing
- Legal pages

### Phase 2: Intelligence 30 đến 60 ngày
- Entity resolution
- AI summaries
- Lead scoring
- Need signal detection
- Search engine
- Team routing
- Mobile app base

### Phase 3: Automation 60 đến 90 ngày
- Workflow engine
- Alerts
- Outreach review
- Compliance console
- Export governance
- Billing metering

### Phase 4: Enterprise 90 đến 180 ngày
- SSO
- Data room
- Dedicated infra
- Advanced audit
- Custom models
- Region controls
- Private deployment

---

## 30) ACCEPTANCE CHECKLIST CHO DEV

### Pháp lý
- [ ] Có Privacy Policy
- [ ] Có Terms of Use
- [ ] Có Data Source Policy
- [ ] Có Deletion Request form
- [ ] Có Objection form
- [ ] Có Suppression list
- [ ] Có audit log
- [ ] Có retention jobs
- [ ] Có source lineage
- [ ] Có robots compliance

### Kỹ thuật
- [ ] Crawl queue chạy cron daily
- [ ] Parser có test coverage
- [ ] Entity resolution có confidence
- [ ] AI enrichment có fallback
- [ ] Search dưới 300ms cho truy vấn chính
- [ ] Dashboard load tốt
- [ ] Export có watermark và log
- [ ] Role permissions chặt
- [ ] Billing metering chính xác
- [ ] Mobile notifications hoạt động

### Sản phẩm
- [ ] Có free plan
- [ ] Có starter
- [ ] Có growth
- [ ] Có pro
- [ ] Có enterprise
- [ ] Có trial onboarding
- [ ] Có ICP templates
- [ ] Có saved views
- [ ] Có alerts
- [ ] Có member usage dashboard

---

## 31) CẢNH BÁO CHIẾN LƯỢC

Muốn bền, không định vị sản phẩm là scraper.
Hãy định vị là:
- Customer Intelligence OS
- Public Data CRM
- Signal driven sales platform
- Compliance first growth system

Giá trị thật nằm ở:
- chuẩn hóa dữ liệu
- giải thích nguồn gốc
- AI hiểu nhu cầu
- workflow đúng thời điểm
- trust và compliance

---

## 32) KẾT LUẬN

Mục tiêu cuối:
Biến dữ liệu công khai thành hệ điều hành bán hàng minh bạch, có thể kiểm chứng, có thể xóa, có thể giải thích, có thể mở rộng toàn cầu.

Không chạy theo số lượng dữ liệu.
Chạy theo:
độ sạch, độ đúng, độ mới, độ hợp pháp, độ hữu ích.

END FILE
