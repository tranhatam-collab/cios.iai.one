CUSTOMER INTELLIGENCE OPERATING SYSTEM

DATA INTELLIGENCE ENGINE SPEC

Version: v1
Type: TECHNICAL HANDOFF (CRITICAL FILE)

==================================================
I. MỤC TIÊU CỦA FILE NÀY

File này khóa logic thực tế của 6 lớp dữ liệu trong CIOS để đảm bảo hệ không biến thành kho dữ liệu rời rạc.

6 lớp này là: 1. Discovery 2. Governance 3. Extraction 4. Normalization 5. Entity Resolution 6. Traceability

Mục tiêu cuối cùng của engine này là:
• biến dữ liệu công khai thành dữ liệu có thể hành động
• luôn biết field đó đến từ đâu
• luôn biết field đó đáng tin đến mức nào
• luôn biết record đó có nên được đưa vào CRM, scoring, search, decision hay review queue hay không

==================================================
II. ĐỊNH NGHĨA TỔNG THỂ

Data Intelligence Engine không phải chỉ là pipeline ETL.

Nó là hệ nhiều tầng chịu trách nhiệm:
• phát hiện nguồn mới
• phân loại mức an toàn của nguồn
• lấy dữ liệu hữu ích
• chuẩn hóa dữ liệu
• nối dữ liệu thành entity thật
• gắn bằng chứng cho mọi field
• phát tín hiệu cho các engine phía sau

Mọi output quan trọng của hệ phải đi qua 6 lớp này trước khi được coi là usable.

==================================================
III. LAYER 1 — DISCOVERY

3.1 Mục tiêu

Tìm ra nguồn dữ liệu mới và tín hiệu mới mà hệ chưa biết trước đó.

3.2 Input

Discovery có thể lấy input từ:
• seed domains
• directories công khai
• search expansion
• social/public references
• external feed
• user imported watchlists
• competitor graphs
• backlink discoveries
• outbound result histories

3.3 Output

Discovery phải tạo ra các object sau:
• source candidates
• company candidates
• page candidates
• watchlist candidates
• market signals candidates

3.4 Logic bắt buộc

Mỗi candidate phải có:
• candidate_type
• source_url or domain
• discovery_method
• discovered_at
• workspace relevance
• geo hints
• language hints
• preliminary confidence
• review status if needed

3.5 Decision rules

Discovery không được đẩy thẳng vào crawl.

Nó phải qua ít nhất 3 bước: 1. classify source candidate 2. evaluate governance eligibility 3. decide allow, hold, reject, review_required

3.6 Chỉ số chất lượng Discovery
• candidate novelty rate
• candidate acceptance rate
• downstream value rate
• duplicate discovery rate
• governance rejection rate
• source productivity over time

==================================================
IV. LAYER 2 — GOVERNANCE

4.1 Mục tiêu

Không cho ingestion đụng nguồn một cách mù quáng.

4.2 Nhiệm vụ

Governance phải quyết định:
• nguồn này có được crawl không
• nguồn này có được recrawl không
• tốc độ bao nhiêu
• phạm vi nào
• mức rủi ro bao nhiêu
• cần người duyệt không

4.3 Governance inputs
• robots rules
• source class
• policy configs
• workspace configs
• legal class
• sensitivity class
• historical source behavior
• previous failure / abuse patterns

4.4 Governance outputs
• allowed
• allowed_with_limits
• metadata_only
• review_required
• blocked
• archived

4.5 Domain Policy Object

Mỗi domain/source phải có:
• crawl_policy
• rate_limit
• path_rules
• retry_policy
• legal_risk_level
• compliance_class
• review_required_for_export
• retention constraints
• workspace restrictions

4.6 Rules tuyệt đối
• blocked source không được vào crawl queue
• review_required source không được auto-expand sâu
• sensitive source không được cho export thẳng
• missing governance state thì mặc định là restricted

==================================================
V. LAYER 3 — EXTRACTION

5.1 Mục tiêu

Chỉ rút ra dữ liệu hữu ích và có thể dùng được.

5.2 Extraction units

Extraction phải vận hành ở cấp:
• page
• section
• field
• contact snippet
• organization snippet
• signal snippet

5.3 Trường dữ liệu chính cần extract

Organization-related
• company name
• legal/public name hints
• primary domain
• website title
• about text
• category hints
• addresses
• phones
• public emails
• social links

Contact-related
• public names
• public roles
• public contact points
• associated domain
• profile references

Signal-related
• hiring pages
• new offerings
• content publication spikes
• site updates
• expansion clues
• tech changes
• leadership changes

5.4 Output format

Extraction output phải tách:
• raw extracted value
• field type
• source position
• extraction method
• extraction confidence
• normalized status false at this stage

5.5 Extraction constraints
• không giả định tên công ty chỉ từ title nếu confidence thấp
• không coi text mơ hồ là contact usable
• không đưa field mơ hồ vào CRM trực tiếp
• không để extraction engine tự merge entity

==================================================
VI. LAYER 4 — NORMALIZATION

6.1 Mục tiêu

Đưa dữ liệu về một hình thức chuẩn và có thể so sánh được.

6.2 Normalization responsibilities
• canonical domain
• standardized organization naming
• region normalization
• language normalization
• social URL canonicalization
• public contact normalization
• industry mapping
• geo hierarchy mapping
• title normalization where appropriate

6.3 Normalization output object

Mỗi field sau normalize phải có:
• original_value
• normalized_value
• normalization_method
• normalization_confidence
• conflict_status
• human_review_needed if any

6.4 Conflict handling

Nếu 2 giá trị mâu thuẫn:
• giữ cả raw values
• không overwrite âm thầm
• gắn conflict flag
• tăng review likelihood
• để entity resolution quyết định bước tiếp theo

6.5 Rules tuyệt đối
• normalized_value không được làm mất raw evidence
• không normalize quá mạnh dẫn đến collapse sai nhiều entity khác nhau
• normalization phải reversible ở mức audit

==================================================
VII. LAYER 5 — ENTITY RESOLUTION

7.1 Mục tiêu

Biết nhiều field, nhiều website, nhiều snippets có thể đại diện cho cùng một thực thể.

7.2 Entity types
• organization
• contact
• domain cluster
• branch
• parent organization
• subsidiary-like relationship
• inferred commercial group

7.3 Inputs cho entity resolution
• normalized names
• canonical domains
• public contacts
• addresses
• social links
• similarity scores
• shared identifiers
• historical merges
• prior manual corrections

7.4 Outputs
• resolved_entity_id
• resolution_confidence
• match reasons
• merge strategy
• review_required
• parent_child hypothesis if applicable

7.5 Resolution modes

Auto-safe

Khi confidence rất cao, không conflict lớn, không nhạy cảm.

Auto-with-guardrails

Khi confidence khá cao nhưng vẫn cần rollback support.

Manual required

Khi:
• confidence thấp
• domain conflict
• legal name conflict
• contact ownership conflict
• possible parent/subsidiary ambiguity

7.6 Merge record requirements

Mỗi merge phải lưu:
• before state
• after state
• match reasons
• actor or engine
• confidence
• reversible flag
• rollback ref
• downstream affected objects

==================================================
VIII. LAYER 6 — TRACEABILITY

8.1 Mục tiêu

Mọi field quan trọng đều truy ngược được về nguồn.

8.2 Field trace requirements

Mỗi field quan trọng phải có:
• source_url
• source_type
• source_record_id
• extraction_method
• normalization_method if any
• first_seen
• last_seen
• extraction_confidence
• field_status
• inferred_or_source_backed
• proof_ref if captured
• workspace visibility class

8.3 Traceability states
• source_backed
• inferred
• conflicting
• stale
• unsupported
• review_required

8.4 Proof modes
• direct source line
• source snippet
• page snapshot ref
• crawl event ref
• extraction ref
• lineage chain

8.5 Rule tuyệt đối

Không có lineage thì:
• không export nhạy cảm
• không trust cao
• không outreach
• không dùng làm basis cho hành động rủi ro cao

==================================================
IX. LUỒNG DỮ LIỆU TỪ 6 LỚP

Discovery
→ Governance Check
→ Extraction
→ Normalization
→ Entity Resolution
→ Traceability Finalization
→ CRM / Search / Scoring / Signals / Decisions

9.1 Rejection points

Hệ phải cho phép reject ở mọi lớp nếu cần:
• discovery reject
• governance block
• extraction unusable
• normalization conflict
• resolution unresolved
• traceability insufficient

==================================================
X. DATA STATES

Mỗi record hoặc field phải có state rõ ràng.

10.1 Record states
• discovered
• queued_for_review
• crawl_allowed
• crawled
• parsed
• normalized
• resolved
• trace_ready
• scored
• decision_ready
• compliance_limited
• archived

10.2 Field states
• extracted
• normalized
• conflicting
• source_backed
• inferred
• stale
• blocked
• review_required

==================================================
XI. CHẤT LƯỢNG DỮ LIỆU BẮT BUỘC

Mỗi record tổng hợp phải có:
• confidence_score
• freshness_score
• completeness_score
• traceability_status
• source_count
• conflict_count
• review_status
• compliance_status
• last_quality_check_at

==================================================
XII. EVENT MODEL CỦA DATA INTELLIGENCE ENGINE

Các event chuẩn:
• source_candidate_discovered
• source_governance_allowed
• source_governance_blocked
• crawl_completed
• parse_completed
• normalization_completed
• field_conflict_detected
• entity_resolved
• entity_merge_review_required
• lineage_attached
• record_traceability_failed
• quality_score_updated

==================================================
XIII. GẮN KẾT VỚI CÁC ENGINE KHÁC

13.1 Sang Scoring

Chỉ record đủ điều kiện mới được scoring cao.

13.2 Sang Signals

Signal detection phải đọc từ record đã normalize + trace.

13.3 Sang CRM

CRM chỉ nhận record usable, không nhận rác extraction.

13.4 Sang Compliance

Traceability và governance state phải được dùng làm input.

13.5 Sang Decision Engine

Decision không được coi inferred low-confidence là source truth.

==================================================
XIV. ABSOLUTE RULES 1. Discovery không được đẩy thẳng vào CRM 2. Governance là bắt buộc trước crawl 3. Extraction không phải source truth cuối cùng 4. Normalization không được xóa raw evidence 5. Entity Resolution phải rollback được 6. Không có traceability thì không có trust cao 7. Không có confidence thì không được xếp hạng mạnh 8. Không dùng AI enrichment để thay thế source-backed facts 9. Không đẩy record conflict cao vào action-ready state 10. Không để hệ trở thành data dump thiếu trạng thái

==================================================
XV. ĐỊNH NGHĨA “ENGINE ĐÚNG”

Data Intelligence Engine được coi là đúng khi:
• phát hiện nguồn mới có giá trị
• chặn nguồn không an toàn
• extract đúng cái cần dùng
• normalize mà không mất sự thật nguồn
• resolve entity với confidence rõ ràng
• truy nguồn tới cấp field
• cung cấp input đáng tin cho CRM, scoring, search, compliance và decision

END FILE
