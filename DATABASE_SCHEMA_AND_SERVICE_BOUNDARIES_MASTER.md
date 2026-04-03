CUSTOMER INTELLIGENCE OPERATING SYSTEM

DATABASE SCHEMA AND SERVICE BOUNDARIES MASTER

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU CỦA FILE NÀY

File này thiết lập "bản đồ phân rã" của hệ thống CIOS, khóa chặt ranh giới (boundaries) giữa các service và chiến lược tổ chức schema database để tránh "cục spaghetti dữ liệu" (monolithic database mess).

Mục tiêu là đảm bảo:
• Mỗi service làm chủ dữ liệu của chính nó.
• Database không bị coupling chéo qua các foreign key ở mức vật lý.
• Các dịch vụ tương tác thông qua contract API hoặc Event Bus.
• Sự toàn vẹn dữ liệu được đảm bảo qua Distributed Transactions (saga pattern) hoặc Eventual Consistency.

==================================================
II. DỊCH VỤ CỐT LÕI (CORE SERVICES)

Dựa trên kiến trúc, CIOS chia thành các service sau:

1.  Identity & Workspace Service (IDWS)
    • Quản lý: User, Tenant (Workspace), Role, Permission, Plan.
2.  Data Intelligence Service (DIS)
    • Quản lý: Source, Candidates, Ingestion Queue, Raw Data, Metadata.
3.  Entity & Core CRM Service (ECS)
    • Quản lý: Resolved Entity (Org/Contact), Linkages, CRM Records.
4.  Compliance & Charter Service (CCS)
    • Quản lý: Policies, Charter rules, Audit Log, Suppression lists, Review items.
5.  Decision & Scoring Service (DSS)
    • Quản lý: Scores, Decision states, Signal snapshots.
6.  Workflow & Flow Service (WFS)
    • Quản lý: Workflow definitions, Executions, Callbacks.

==================================================
III. CHIẾN LƯỢC TỔ CHỨC SCHEMA (DATABASE STRATEGY)

3.1 Ranh giới vật lý (Physical Separation)

- **Rule:** Mỗi Service CỐ ĐỊNH có Database (Schema) riêng.
- Không service nào được truy vấn trực tiếp vào database của service khác.
- Chỉ truy cập thông qua API nội bộ của service chủ quản.

3.2 Ranh giới logic (Logical Separation)

- Mọi record liên-service phải sử dụng `GlobalID` (UUID v7 hoặc tương đương) thay vì Integer ID để dễ dàng track và join ở tầng Application/Service level.
- Không sử dụng `Foreign Key` giữa các database service khác nhau (ví dụ: `Data.source_id` không thể tham chiếu sang `Entity.entity_id` bằng database constraint).

3.3 Quản lý Schema Changes

- Mỗi service tự quản lý migrations riêng (e.g., folder `services/identity/migrations`).
- Migration phải idempotent và không được block service khi chạy.

==================================================
IV. CHIẾN LƯỢC TƯƠNG TÁC DỮ LIỆU

4.1 Eventual Consistency

- Sử dụng Event Bus (NATS/Kafka) làm xương sống.
- Khi Entity thay đổi (ECS), emit event `entity.updated` -> DSS tính lại điểm -> WFS kiểm tra trigger -> CCS log audit.

4.2 API Contract

- Service A lấy dữ liệu của Service B qua API, KHÔNG lấy qua Database View/Replica.
- API phải tuân thủ versioning.

4.3 Shared Data

- Nếu nhiều service cần dùng chung một dữ liệu (ví dụ: `WorkspaceID`), mỗi service tự lưu trữ metadata cần thiết của Workspace đó. Khi Workspace thay đổi, IDWS emit event cập nhật.

==================================================
V. ĐỊNH NGHĨA SERVICE BOUNDARIES (Ranh giới dữ liệu)

| Service  | Sở hữu dữ liệu             | Trách nhiệm                         |
| :------- | :------------------------- | :---------------------------------- |
| **IDWS** | Users, Workspaces, RBAC    | Xác thực & Phân quyền tenant.       |
| **DIS**  | Sources, Ingestion State   | ETL, Normalize, Traceability.       |
| **ECS**  | Entities, CRM Data         | Resolved Entities, CRM fields.      |
| **CCS**  | Audit, Policies, Approvals | Compliance & Charter enforcement.   |
| **DSS**  | Scores, Signals, Decisions | Scoring engine & decision history.  |
| **WFS**  | Workflow Executions        | Flow dispatch & external callbacks. |

==================================================
VI. ABSOLUTE RULES 1. KHÔNG chia sẻ Database giữa các Service. 2. KHÔNG tạo Cross-Database Foreign Keys. 3. Mọi giao dịch liên-service phải thông qua API hoặc Event Bus. 4. Service B KHÔNG bao giờ được sửa trực tiếp Database của Service A. 5. Mọi dữ liệu nhạy cảm (compliance, Charter) phải được lưu trữ trong DB của CCS. 6. Sử dụng GlobalID cho mọi thực thể chia sẻ giữa các service. 7. Database schema của mỗi service phải được định nghĩa trong `services/<service_name>/schema`. 8. Mỗi service phải có `AuditLog` riêng (khi cần) hoặc đổ về `Audit Service` chung qua event. 9. Nếu cần "View" dữ liệu tổng hợp (ví dụ: dashboard), hãy tạo một Service Aggregator riêng, không ép các service chính phải làm view cho nhau. 10. Mọi thay đổi schema ảnh hưởng đến service khác phải qua quy trình RFC (Request for Comments) nội bộ.

==================================================
VII. ĐỊNH NGHĨA “BOUNDARY ĐÚNG”

Kiến trúc database và service được coi là đúng khi:
• Một service chết không kéo theo service khác (cô lập tốt).
• Nâng cấp schema của DIS không ảnh hưởng đến ECS hay CCS.
• Dữ liệu toàn vẹn được duy trì qua event-driven patterns.
• Dễ dàng scale từng service độc lập.
• Team phát triển có thể tự quản lý dữ liệu mà không sợ đụng độ schema của team khác.

END FILE
