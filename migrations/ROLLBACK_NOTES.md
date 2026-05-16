# Rollback Notes for Phase 1 Migrations

Muc tieu file nay:

- ghi ro rollback-safe strategy cho cac migration moi
- tranh rollback vo tinh lam mat du lieu van hanh

Nguyen tac chung:

1. Khong rollback DB schema bang cach xoa bang cot trong su co nong tru khi da backup.
2. Uu tien rollback app/worker version truoc; de schema mo rong (forward-compatible).
3. Neu buoc rollback can tac dong DB, phai co backup snapshot va duyet operational owner.

---

## 0005_review_queue.sql

Tac dong:

- tao bang `review_items`

Rollback-safe recommendation:

- KHONG drop `review_items` khi rollback code.
- App version cu co the bo qua bang nay an toan.

Manual rollback (chi khi bat buoc):

- backup du lieu review truoc
- export records
- moi drop bang

---

## 0006_review_audit_realtime.sql

Tac dong:

- them cot mo rong cho `review_items`
- them cot structured audit cho `compliance_audit_logs`

Rollback-safe recommendation:

- giu cot moi, rollback code van chay duoc neu query khong phu thuoc cot moi.
- khong remove cot trong incident branch.

---

## 0007_flow_runs.sql

Tac dong:

- tao bang `flow_runs`

Rollback-safe recommendation:

- khong xoa bang; flow logs la du lieu truy vet quan trong.
- rollback service truoc, giu schema.

---

## 0008_realtime_event_store.sql

Tac dong:

- tao bang `realtime_events`

Rollback-safe recommendation:

- khong xoa bang khi rollback app; co the tam tat route su dung no.
- du lieu event co the dung cho forensic/debug.

---

## 0009_discovery_governance_state_hardening.sql

Tac dong:

- them cot state cho `discovery_sources`
- them cot state cho `crawl_governance_decisions`
- update du lieu seed sang state shape moi

Rollback-safe recommendation:

- rollback logic route/repository neu can, nhung giu cot state.
- khong can reverse data update seed; app cu van doc duoc cot cu.

---

## Operational rollback order (khuyen nghi)

1. rollback workers/pages/backend version
2. chay smoke nhanh de xac nhan route on dinh
3. danh gia co can DB rollback khong
4. chi DB rollback khi da backup + approved
