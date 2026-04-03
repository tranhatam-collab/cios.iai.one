CUSTOMER INTELLIGENCE OPERATING SYSTEM

COMPLIANCE AND CONSTITUTIONAL FLOW

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU CỦA FILE NÀY

File này khóa logic chi tiết của:
• Compliance Layer
• Constitutional Layer
• Charter Enforcement Engine
• Action gating
• Review-required states
• Audit chain trước mọi hành động nhạy cảm

CIOS không được xem compliance là module phụ.
Compliance và Constitutional Flow phải là lớp quyết định:
• action nào được phép
• action nào phải chặn
• action nào phải đưa qua người duyệt

==================================================
II. ĐỊNH NGHĨA

2.1 Compliance Flow là gì

Là chuỗi kiểm tra và kiểm soát trước mọi hành động nhạy cảm liên quan đến dữ liệu, export, outreach, merge, override, retention, deletion.

2.2 Constitutional Flow là gì

Là lớp policy-aware control cao hơn compliance thông thường, dùng để kiểm tra action theo:
• role
• workspace policy
• source governance
• compliance state
• organizational charter rules
• sensitive action class
• required obligations

2.3 Charter Enforcement Engine là gì

Là engine trả về 1 trong 3 kết quả:
• allow
• deny
• review_required

Không được chỉ có allow/deny.

==================================================
III. ACTION CLASSIFICATION MODEL

Mọi action phải được gắn class trước khi kiểm tra.

3.1 Auto-safe actions
• refresh score
• recrawl allowed sources
• regenerate summaries
• notify assigned owner
• refresh freshness
• reindex search

3.2 Auto-with-guardrails actions
• create lead
• assign owner
• create task
• suggest export
• suggest outreach
• auto-merge high-confidence entity
• dispatch non-sensitive workflow

3.3 Manual required actions
• risky export
• deletion approval
• suppression override
• compliance override
• outreach with low confidence
• low-confidence merge
• source policy override
• high-risk workflow dispatch

==================================================
IV. COMPLIANCE CHECK INPUT MODEL

Mỗi action request phải có object kiểm tra thống nhất.

4.1 Required inputs
• actor_id
• actor_role
• workspace_id
• action_type
• action_class
• target_object_type
• target_object_id
• target_record_confidence
• target_traceability_status
• target_compliance_status
• target_source_governance_state
• legal_basis_status if relevant
• suppression_status if relevant
• review_status
• export_sensitivity if relevant
• requested_at
• reason
• trace_id

4.2 Optional contextual inputs
• segment size
• destination system
• target geography
• data category class
• workspace charter mode
• required approvals count
• prior similar denials

==================================================
V. COMPLIANCE FLOW

5.1 Chuỗi chuẩn

Action Request
→ Permission Check
→ Record State Check
→ Source Governance Check
→ Compliance Rule Check
→ Suppression / Deletion / Retention Check
→ Sensitivity Check
→ Constitutional Check if enabled
→ allow / deny / review_required
→ Audit Log

5.2 Permission Check

Xác định:
• actor có quyền làm action này không
• actor có quyền trên object này không
• actor có thuộc workspace đúng không

5.3 Record State Check

Xác định:
• record có usable không
• confidence có đủ không
• traceability có đủ không
• stale quá không
• review_status ra sao

5.4 Source Governance Check

Xác định:
• nguồn có class restricted không
• source có policy giới hạn export hoặc outreach không
• domain policy có chặn không

5.5 Compliance Rule Check

Xác định:
• legal basis đủ chưa
• data category có cần hạn chế không
• workspace rules có cho không
• compliance score có quá thấp không

5.6 Suppression / Deletion / Retention Check

Xác định:
• có suppression active không
• có deletion request pending không
• retention có hết hạn chưa
• record có bị block toàn phần không

5.7 Sensitivity Check

Xác định:
• đây là export nhạy cảm hay không
• đây là outreach rủi ro hay không
• đây là merge rủi ro hay không

==================================================
VI. CONSTITUTIONAL FLOW

6.1 Khi nào chạy Constitutional Check

Chạy khi:
• workspace bật constitutional mode
• action thuộc class nhạy cảm
• flow dispatch có thể tạo hệ quả lớn
• override hoặc exception được yêu cầu
• export khối lượng lớn
• action chạm vào rules, suppression, retention, governance

6.2 Charter input model
• charter_version
• workspace_policy_set
• action_type
• actor_role
• target_object_class
• risk_level
• compliance_state
• obligations
• prohibited_patterns
• required_approvals
• escalation_paths

6.3 Constitutional output model
• decision: allow / deny / review_required
• reasons[]
• policy_refs[]
• obligations[]
• required_approvals
• escalation_target if any
• trace_id

6.4 Obligations concept

Constitutional output có thể cho phép action nhưng kèm obligations:

Ví dụ:
• allow but log export
• allow but require manager notification
• allow but mask certain fields
• allow but create review task
• allow but limit scope

==================================================
VII. CHARTER ENFORCEMENT ENGINE LOGIC

7.1 Core logic

CEE phải đánh giá ít nhất 6 chiều: 1. Actor legality 2. Action sensitivity 3. Record trustworthiness 4. Source permissibility 5. Workspace / org rules 6. Charter-defined boundaries if enabled

7.2 Decision logic

Allow

Khi:
• quyền hợp lệ
• source hợp lệ
• compliance đủ
• confidence đủ
• action class an toàn
• charter không cấm

Deny

Khi:
• actor không có quyền
• record bị suppression
• deletion pending
• source blocked
• traceability không đủ cho action này
• charter cấm tuyệt đối

Review required

Khi:
• confidence borderline
• source restricted but not blocked
• export lớn
• merge low-confidence
• action nhạy cảm nhưng không bị cấm
• charter yêu cầu escalation

7.3 Không được làm gì
• không để frontend là nơi quyết định allow/deny cuối cùng
• không chỉ dùng role check thay cho compliance check
• không bỏ qua review_required
• không bypass CEE bằng internal API không audit

==================================================
VIII. REVIEW QUEUE MODEL

8.1 Review queue types
• export review
• merge review
• compliance override review
• outreach risk review
• source override review
• workflow dispatch review

8.2 Review item fields
• review_id
• review_type
• created_from_action
• actor_id
• workspace_id
• target_object_ref
• reason_codes
• evidence_bundle_ref
• due_at
• severity
• assigned_reviewer
• resolution_status

8.3 Review outcomes
• approved
• rejected
• approved_with_conditions
• expired
• escalated

==================================================
IX. AUDIT MODEL

9.1 Mọi compliance/constitutional action phải log
• actor
• action
• target
• workspace
• result
• reasons
• policy refs
• obligations
• before and after state if relevant
• timestamp
• trace_id

9.2 Must-have audit views
• denied actions
• review_required actions
• approvals by reviewer
• overrides
• exports by date
• source policy overrides
• deletion / suppression decisions

==================================================
X. INTEGRATION WITH FLOW

10.1 Flow dispatch must be policy-aware

Trước khi dispatch sang flow.iai.one:
• check permission
• check compliance
• check constitutional rules
• check workflow sensitivity
• check review requirements

10.2 Dispatch outcomes
• dispatched
• denied
• review_required
• dispatched_with_obligations

10.3 Callback handling

Kết quả từ Flow phải quay về:
• execution status
• output summary
• compliance event if needed
• new review item if failure risky
• audit linkage

==================================================
XI. INTEGRATION WITH UI

UI phải hiển thị rõ:
• compliance status
• constitutional status if enabled
• safe / blocked / review required
• why this is blocked
• what is needed to proceed
• who can review
• last policy evaluation time

11.1 Action button states
• enabled
• disabled with reason
• review required
• approval pending
• masked action
• limited scope action

==================================================
XII. RULES TUYỆT ĐỐI 1. Không có permission thì deny 2. Không có traceability đủ thì không export nhạy cảm 3. Có suppression thì không outreach 4. Có deletion pending thì chặn action liên quan 5. Source blocked thì không dùng cho action rủi ro 6. Review required không được âm thầm auto-allow 7. Frontend không phải source of truth cho enforcement 8. Internal services cũng phải audit khi bypass path nhạy cảm 9. Obligations phải được log và nếu cần thực thi tiếp 10. CEE phải là một decision engine có cấu trúc, không phải if-else tạm bợ

==================================================
XIII. ĐỊNH NGHĨA “FLOW ĐÚNG”

Compliance and Constitutional Flow được coi là đúng khi:
• action nhạy cảm luôn bị chặn đúng chỗ
• review_required được dùng thật
• mọi denial đều có lý do rõ
• mọi approval đều có audit
• UI hiển thị được policy result dễ hiểu
• flow dispatch không bỏ qua policy gate
• obligations được theo dõi
• constitutional mode có thể bật/tắt theo workspace mà không phá core compliance

END FILE
