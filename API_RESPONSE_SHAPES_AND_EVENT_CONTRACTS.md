CUSTOMER INTELLIGENCE OPERATING SYSTEM

API RESPONSE SHAPES AND EVENT CONTRACTS

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU CỦA FILE NÀY

File này khóa chặt "ngôn ngữ chung" của hệ thống CIOS. Dù service nào viết bằng ngôn ngữ nào, khi nói chuyện với nhau (qua API hoặc Event Bus), chúng PHẢI tuân thủ các cấu trúc dữ liệu này.

Mục tiêu là:
• Frontend luôn nhận được response dự đoán được.
• Các service hiểu được event của nhau mà không cần parse thủ công phức tạp.
• Lỗi hệ thống được báo cáo thống nhất.
• Context (User/Tenant) được truyền xuyên suốt an toàn.

==================================================
II. API RESPONSE ENVELOPE (STANDARD)

Mọi API endpoint (Internal & External) phải tuân theo cấu trúc JSON sau:

```json
{
  "ok": boolean,
  "data": T | null,
  "meta": {
    "request_id": string,
    "timestamp": string,
    "version": string,
    "pagination": {
      "page": number,
      "limit": number,
      "total": number
    } | null
  },
  "error": {
    "code": string,
    "message": string,
    "details": object | null,
    "retryable": boolean
  } | null
}
```

2.1 Các quy tắc trường:
• `ok`: luân chuyển trạng thái true/false.
• `data`: chứa payload chính hoặc list. Nếu `ok: false`, `data` thường là `null`.
• `meta.request_id`: BẮT BUỘC, dùng để track log từ frontend tới tận service sâu nhất.
• `error.code`: Mã lỗi định danh (ví dụ: `AUTH_INVALID`, `RESOURCE_NOT_FOUND`, `COMPLIANCE_DENIED`).

==================================================
III. EVENT BUS CONTRACTS (NATS/KAFKA)

Mọi message trong Event Bus phải có envelope chung để Routing và Tracing.

3.1 Event Envelope

```json
{
  "event_id": "uuid-v7",
  "event_type": "domain.action.result",
  "version": "1.0.0",
  "source": "service_name",
  "timestamp": "iso-8601-string",
  "context": {
    "workspace_id": "uuid",
    "user_id": "uuid",
    "trace_id": "uuid-v7"
  },
  "payload": { ... }
}
```

3.2 Ví dụ sự kiện thực tế:

`entity.updated`

```json
{
  "event_type": "entity.updated",
  "payload": {
    "entity_id": "uuid",
    "changed_fields": ["name", "domain"],
    "new_state": { ... }
  }
}
```

`compliance.denied`

```json
{
  "event_type": "compliance.denied",
  "payload": {
    "action_id": "uuid",
    "reason_code": "POLICY_VIOLATION",
    "target_object_id": "uuid"
  }
}
```

==================================================
IV. ERROR HANDLING & STATUS CODES

Hệ thống CIOS ưu tiên `error.code` thay vì chỉ dựa vào HTTP Status Code để frontend xử lý.

4.1 Mapping lỗi thông dụng
• `400 BAD_REQUEST`: Sai cấu trúc request.
• `401 AUTH_INVALID`: Token sai/hết hạn.
• `403 FORBIDDEN`: Không có quyền.
• `403 COMPLIANCE_DENIED`: Hành động bị chặn bởi CEE.
• `404 RESOURCE_NOT_FOUND`: Object không tồn tại.
• `429 TOO_MANY_REQUESTS`: Rate limit.
• `500 INTERNAL_ERROR`: Lỗi hệ thống không mong đợi.
• `503 SERVICE_UNAVAILABLE`: Service tạm ngắt.

==================================================
V. SECURITY CONTEXT PROPAGATION

Context của Request (User, Tenant, Auth, TraceID) phải được truyền từ: 1. Frontend -> Gateway (qua Header `Authorization`, `X-Workspace-ID`) 2. Gateway -> Internal API (qua Header nội bộ) 3. Service A -> Event Bus (qua `envelope.context`)

Mọi service KHÔNG ĐƯỢC tin tưởng request nếu thiếu context.

==================================================
VI. VERSIONING STRATEGY

- **API Versioning:** `/api/v1/entities`, `/api/v2/entities`.
- **Event Versioning:** Trường `version` trong Envelope. Event v1 và v2 có thể tồn tại song song, service subcribe phải handle được cả hai hoặc migrate.

==================================================
VII. ABSOLUTE RULES 1. KHÔNG ĐƯỢC phép trả về dữ liệu thuần (bare array/object) không nằm trong Envelope. 2. Mọi response lỗi BẮT BUỘC phải có `request_id` để trace. 3. KHÔNG ĐƯỢC thay đổi cấu trúc `payload` của event đã public nếu không có version mới. 4. Không được gửi dữ liệu nhạy cảm (PII/Secret) vào Event Bus nếu không encrypted. 5. Service phải validate contract trước khi process event. 6. Mọi `error.code` phải được tài liệu hóa trong Wiki của Service đó. 7. Frontend phải handle `ok: false` mọi trường hợp. 8. Request_id phải được truyền xuyên suốt qua Headers (X-Trace-ID). 9. Event không được quá lớn (>1MB), nếu lớn phải dùng "Claim Check" pattern (chỉ gửi ref vào event, service tự fetch data). 10. Mọi schema thay đổi phải được đăng ký trong Schema Registry (nếu có).

==================================================
VIII. ĐỊNH NGHĨA “CONTRACT ĐÚNG”

API và Event Contract được coi là đúng khi:
• Frontend team không cần hỏi backend "trường này tên là gì".
• Service mới gia nhập hệ thống có thể hiểu ngay dữ liệu của service cũ thông qua doc về Envelope.
• Khi có lỗi, chỉ cần `request_id` là có thể tra cứu toàn bộ hành trình lỗi xuyên suốt các service.
• Mọi thay đổi contract không làm "gãy" các service cũ (tương thích ngược).

END FILE
