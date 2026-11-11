# CIOS — STATUS

**Surface:** `cios.iai.one`  
**Role:** Enterprise intelligence product  
**Updated:** 2026-11-11  
**Verdict:** R1 **Founder GO** (2026-11-06, baseline `1ce53dd`; merge `main@af33c10`, tree trùng) — **chưa deploy** vì token Cloudflare của CI không hợp lệ; production vẫn chạy bản GO 2026-10-27 `main@c0b350f` trên Workers+Pages (account `f3f9…`, kiểm 2026-11-06T13:07Z); ecosystem handoff `*.iai.one` vẫn chưa GO toàn hệ

**Baseline đang chạy production:** `main@c0b350f` (CI/CD green run [40340029318](https://github.com/tranhatam-collab/cios.iai.one/actions/runs/40340029318); code-identical to `e56bdd3`/[40339746459](https://github.com/tranhatam-collab/cios.iai.one/actions/runs/40339746459))  
**Worker active version:** `fd561a4d-f8c0-4756-9701-ccf94739b674` — tạo bởi secret change 2026-10-27T07:30Z, cùng script etag `8827ff55…` với `7cec0ecc-62d1-435b-8402-4b0c5428159d` (deploy từ `c0b350f`)  
**Pages deployment:** `https://56a11a09.cios-iai-one-3ai.pages.dev` (source `c0b350f`) → `https://cios.iai.one`  
**Đã merge, chưa deploy:** `main@af33c10` — merge commit của [PR #4](https://github.com/tranhatam-collab/cios.iai.one/pull/4) (cha `c0b350f` + `1ce53dd`; tree `8b51a7ac…` trùng `1ce53dd`). CI run [42222397302](https://github.com/tranhatam-collab/cios.iai.one/actions/runs/42222397302) (2026-11-06T13:03–13:05Z): `build-test` ✓; Deploy Workers ✗ (`Authentication error [code: 10000]`, `Invalid access token [code: 9109]`); Deploy Pages ✗ (account lock đạt, tra project Pages HTTP 401); hai smoke bị bỏ qua → production không đổi.  
_Checked 2026-11-06T13:07Z: Worker `wrangler deployments status` = `fd561a4d` 100%; `/v1/meta` chưa có `release.commit`; `version.json` `generatedAt` vẫn 2026-10-26T14:30:41Z. Lần kiểm Pages ID gần nhất: 2026-10-27T14:09Z (`pages deployment list`). ID đổi sau mỗi deploy hoặc `wrangler secret put`; nguồn xác nhận build đang chạy là post-deploy smoke (`/v1/meta` `release.commit`, `version.json` `commit`)._

## Founder decisions

| Date | Decision | Scope / conditions |
|------|----------|--------------------|
| 2026-10-27 | **GO** R1 | Baseline `main@c0b350f`, R1 surface bên dưới; không gồm R2. Approval không tự áp dụng cho commit mới (Release Gates RG13): push `main` = auto-deploy, nên mỗi baseline mới cần GO trước khi push. Rủi ro còn mở: alerts chưa kiểm, CORS còn origin Pages cũ, stack `93112cc…` còn public (xem _Open_). |
| 2026-10-27 | Cloudflare account production = `f3f9e76222dcb488d5e303e29e8ba192` | Account sở hữu domain `cios.iai.one`; CI deploy jobs từ chối account khác. |
| 2026-10-27 | Duyệt D1 restore drill (export → import D1 tạm) và dọn dẹp sau báo cáo | Không ghi vào DB production; kết quả ở _Ops evidence_. |
| 2026-10-28 | Duyệt các mục ops còn mở: restore cutover drill, rollback drill, kiểm alerts, dọn stack `93112cc…` | Drill chạy trên tài nguyên cách ly hoặc version giống hệt production; xóa dữ liệu stack cũ do Founder thực hiện (xem _Open_). |
| 2026-11-06 | **GO** baseline `1ce53dd` (R1 surface, không gồm R2) | Founder xác nhận trong chat ("go -all", rồi "GO, merge PR #4") sau audit độc lập. Ruleset `phase0-protect-default` (bắt buộc PR, `bypass_actors` rỗng) chặn push thẳng, nên phát hành qua [PR #4](https://github.com/tranhatam-collab/cios.iai.one/pull/4): merge commit `af33c10` (cha `c0b350f` + `1ce53dd`; tree `8b51a7ac…` trùng `1ce53dd`); SHA dự kiến deploy là `af33c10`. Merge vào `main` = deploy production, nhưng lần deploy đầu (run 42222397302, 2026-11-06T13:04Z) **thất bại** vì token Cloudflare của CI không hợp lệ; production vẫn chạy `c0b350f` (kiểm 13:07Z). Cần token bền vững rồi re-run failed jobs trên cùng commit (cùng GO). Rủi ro còn mở: CORS cũ còn trên production tới khi deploy, alerts chưa kiểm (BLOCKED), stack `93112cc…` còn public (xem _Open_). |

## Canonical API

| Layer | URL |
|-------|-----|
| Frontend | `https://cios.iai.one` |
| Workers API | `https://cios-workers-api.tranhatam.workers.dev` |
| Fly API | `https://cios-api.fly.dev` — **không dùng** (DNS dead) |

## Path lock (QA)

- `POST /v1/auth/session` — không viết `/auth`
- `GET /v1/auth/me` — không viết `/me`
- `GET /v1/meta`, `GET /v1/system/health`

## Integrations

- AIAgent: `https://api.aiagent.iai.one` → R2 backlog on Workers
- Frontend: `site/js/api-client.js` → Workers

## Demo / auth

Demo seed **tắt** trên production trừ khi `ALLOW_DEMO_SEED=true` **và** secret `AUTH_DEMO_PASSWORD` được set.  
Không công bố mật khẩu production trong STATUS. Role register do server gán (`sales_rep`); open register luôn workspace `demo`.

## R1 surface (Workers + D1) — LIVE

- Auth: register role server-assigned; demo seed gated; JWT `jti` revoke; CORS allowlist; `FLOW_WEBHOOK_SECRET` set
- Product reads: `/v1/bootstrap`, `/v1/overview`, `/v1/crm/organizations`, `/v1/discovery/*`, `/v1/compliance/audit`, `/v1/review/queue`
- Ngoài R1: Stripe/payment, Google OAuth, SSE, CRM write/import/enrich

## Cloudflare account lock

Production Pages/Workers: account `f3f9e76222dcb488d5e303e29e8ba192` (domain `cios.iai.one`; Founder xác nhận 2026-10-27). D1 production: `cios-workers-api-db` `d4f3a44d-8f6e-4344-8679-749123c7aa33`.  
GitHub Actions: `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` + `SMOKE_WORKERS_API_URL`; `ci.yml` khóa `CLOUDFLARE_ACCOUNT_LOCK` = account trên.  
**Không phải production:** account `93112cc…` còn stack CIOS cũ, vẫn public (kiểm 2026-10-27T17:12Z): Worker `cios-workers-api` (active `3caa30db…` từ 2026-04-22; `cios-workers-api.tranhatam66.workers.dev/v1/system/health` 200), D1 `cios-workers-api-db` `5ccf0c5b…` (4 bảng: audit 357, events 131, flow_logs 205, idempotency 4 dòng; 0 query/24h), Pages `cios-iai-one` (`cios-iai-one.pages.dev` 200, deploy cuối ~5 tháng trước, không gắn `cios.iai.one`).  
**Backup D1 cũ (2026-11-06, chỉ đọc):** `wrangler d1 export` trên account `93112cc…` → file local `~/cios-old-93112cc-d1-backup-20261106.sql` (mode 600, 226 214 B, sha256 `dede2def…e039`); nạp thử vào SQLite khớp số đếm: audit 358, events 131, flow_logs 205, idempotency 4. Dòng audit thứ 358 (2026-11-06T11:45:11Z, `governance_audit_read`, `failed`) là probe không token, khớp khung giờ probe của báo cáo audit; hoạt động thật cuối 2026-05-18T17:07Z. Tài khoản này còn D1 của dự án khác: chỉ xóa đúng 3 tài nguyên CIOS (Worker `cios-workers-api`, Pages `cios-iai-one`, D1 `5ccf0c5b-cbd4-42b5-a66b-5c089267e311`), nhận diện bằng account + UUID vì tên trùng production.  
**Phụ thuộc cần gỡ trước khi xóa:** CORS production (`services/api/src/lib/cors.ts`) còn cho phép `https://cios-iai-one.pages.dev` và `*.cios-iai-one.pages.dev` — origin của project Pages cũ (Worker live phản hồi `access-control-allow-origin` cho origin này). Xóa project trước khi gỡ CORS thì tên `cios-iai-one.pages.dev` có thể bị người khác nhận lại. Đã gỡ trong code, merge vào `main` (`af33c10`, 2026-11-06T13:03Z) nhưng **chưa deploy** (xem _CI / CD_): preflight production 2026-11-06T13:07Z vẫn phản chiếu `https://cios-iai-one.pages.dev` và `https://main.cios-iai-one.pages.dev`.

## Secrets / bindings (ops)

- Required Worker secrets: `JWT_SECRET`, `FLOW_WEBHOOK_SECRET` (`wrangler secret put`)
- Optional: `CIOS_KV` (D1 revoke fallback OK); `ALLOW_DEMO_SEED` + `AUTH_DEMO_PASSWORD` staging only

## CI / CD (main)

- Triggers: `push` + `workflow_dispatch`; production deploy **chỉ từ `main`** (push `dev` và PR dừng ở `build-test`)
- Nhánh `main` có ruleset `phase0-protect-default` (từ 2026-10-27): cấm xóa và force-push, bắt buộc PR (0 approval, không required check), `bypass_actors` rỗng → không push thẳng được. Merge PR = deploy production nên GO của Founder phải có trước khi merge. `concurrency` hủy run đang chạy cùng ref: không merge/push lần hai khi deploy chưa xong
- Lần chạy đầu của pipeline mới — run [42222397302](https://github.com/tranhatam-collab/cios.iai.one/actions/runs/42222397302) trên `main@af33c10` (2026-11-06T13:03–13:05Z): `build-test` success (1 m 11 s); `Deploy Cloudflare Workers API` **failure** (`Authentication error [code: 10000]`, `Invalid access token [code: 9109]`); `Deploy Cloudflare Pages` **failure** (account lock đạt, tra project Pages HTTP 401); `Smoke Workers` / `Smoke Pages` skipped → production không đổi. Nguyên nhân: secret `CLOUDFLARE_API_TOKEN` (đặt 2026-10-26T14:18Z) không còn hợp lệ, khả năng cao là OAuth token hết hạn (`NOT_CHECKED`: không đọc được giá trị secret). Xử lý: tạo Cloudflare API token bền vững (Account → Workers Scripts: Edit, Cloudflare Pages: Edit; chỉ account `f3f9…`), cập nhật secret, rồi `gh run rerun 42222397302 --failed` (cùng commit, không cần GO mới)
- Jobs: `build-test` (typecheck root + `services/api`, build, lint, test) → parallel `Deploy Cloudflare Workers API` + `Deploy Cloudflare Pages` → `Smoke Workers (post-deploy)` / `Smoke Pages (post-deploy)`
- Post-deploy smoke chờ edge phục vụ đúng commit: Worker `/v1/meta` `release.commit` (CI inject `GIT_SHA`) và `cios.iai.one/version.json` `commit` phải bằng `github.sha`; kèm 401 (no JWT) / 404 / 400 (`POST /v1/auth/session {}`) / CORS từ chối origin lạ / homepage text
- Pipeline cũ (trước thay đổi trên): receipt `c0b350f`/`40340029318`, `e56bdd3`/`40339746459`, `e066838`/`40338919524` — all jobs **success** (2026-10-26); smoke khi đó chạy **trước** deploy nên không xác nhận build mới

## Ops evidence (account `f3f9…`, giờ UTC)

- D1 Time Travel: `wrangler d1 time-travel info cios-workers-api-db` trả bookmark hiện tại → PITR khả dụng. Cơ chế `time-travel restore` đã diễn tập trên DB cách ly (cutover drill bên dưới); restore tại chỗ trên production chưa chạy vì ghi đè production — chỉ dùng khi sự cố
- D1 restore drill (2026-10-27T15:29–15:32Z): `d1 export` production tại bookmark `0000000b-00000000-00005111-9b32b305…` (15 410 B, sha256 `d9879896…d443`, 4 s) → import vào D1 tạm `cios-restore-drill-20261027` (`d0af4983-4bd8-4f38-9265-0a3106b46023`, 57 statements, 3 s). Khớp: 11 bảng + 6 index, số dòng 12/12 bảng (38 dòng gồm `sqlite_sequence`), size 135 168 B; export lại D1 tạm **byte-identical** (cùng sha256). Production chỉ export + metadata, `write_queries_24h` giữ 8. D1 tạm và file export đã xóa 15:59Z
- Restore cutover drill, cách ly (2026-10-27T17:04–17:07Z): export production (sha256 `d9879896…` như drill trên → dữ liệu không đổi) → D1 `cios-drill-20261028` (`3cdee646…`) → khớp 11 bảng, 6 index, số dòng 12/12 bảng. Thử `time-travel restore`: xóa `api_events` + tạo bảng lạ → restore về bookmark trước đó (3 s) → khớp lại export. Worker cách ly `cios-drill-restore-api` (code `c0b350f`, secret ngẫu nhiên) trên DB restore: smoke `--read-only` và `--strict` exit 0; API đọc đúng dữ liệu restore (`/v1/crm/organizations` 3, `/v1/governance/audit` gồm 19 log cũ, compliance/review 1). Export → Worker healthy: 2 phút 02 giây (gồm bước thử time-travel). Worker, D1 drill và file đã xóa 17:07Z
- Rollback drill production (2026-10-27T17:08–17:10Z): `versions upload` build `c0b350f` → `5e800ba8-bd05-4621-8e98-a607f3f33800` (tag `rollback-drill-20261028`; etag `8827ff55…`, compatibility date và bindings giống hệt `fd561a4d`, secret kế thừa) → smoke preview URL → `versions deploy 5e800ba8@100` → smoke production → `wrangler rollback fd561a4d` (3 s) → active `fd561a4d` 100%; smoke Workers + Pages exit 0, `/v1/system/health` 200, D1 `write_queries_24h` giữ 8. `5e800ba8` còn trong version history, không nhận traffic
- Logs: `[observability] enabled = true`. Alerts/notifications: **BLOCKED** (2026-10-27T17:10Z) — wrangler OAuth không có scope Notifications; browser của agent chưa đăng nhập dashboard
- Bindings live (`fd561a4d`): `JWT_SECRET`, `FLOW_WEBHOOK_SECRET` (secret), `CIOS_DB` (D1); không có `ALLOW_DEMO_SEED` / `AUTH_DEMO_PASSWORD` → demo seed tắt

## Open / R2

- [x] Harden CI Workers `npm ci` peer deps (`--legacy-peer-deps`)
- [x] Pages deploy independent of Workers job; `workflow_dispatch` chạy smoke+CD
- [x] Bỏ deploy production từ `dev`; smoke sau deploy + kiểm commit; typecheck `services/api` trong CI; account lock — đã merge vào `main` (`af33c10`, 2026-11-06); `build-test` xanh trên GitHub Actions (PR #4 và run 42222397302), account lock đạt ở cả hai job deploy; các job deploy và smoke mới **chưa được xác nhận** (deploy lỗi token, xem _CI / CD_)
- [x] D1 restore drill (export → import D1 tạm, 2026-10-27; khớp bảng/dòng, round-trip byte-identical)
- [x] Restore cutover drill cách ly + thử `time-travel restore` (2026-10-27T17:04Z)
- [x] Rollback drill production với version giống hệt (2026-10-27T17:09Z; rollback 3 s)
- [ ] Alerts/notifications cho Worker + Pages — BLOCKED: cần dashboard đã đăng nhập hoặc API token có quyền Notifications; chọn người nhận và tạo event thử
- [ ] Gỡ `cios-iai-one.pages.dev` và `*.cios-iai-one.pages.dev` khỏi CORS allowlist — đã sửa (`cors.ts` + test) và merge vào `main` (`af33c10`, 2026-11-06); **chưa deploy** nên production còn phản chiếu origin cũ (kiểm 2026-11-06T13:07Z) — đóng khi preflight hết phản chiếu
- [ ] Dọn stack CIOS cũ ở `93112cc…`, sau khi bản gỡ CORS đã live (preflight từ `https://cios-iai-one.pages.dev` không còn nhận `access-control-allow-origin`): backup D1 `5ccf0c5b…` **đã xong** 2026-11-06 (xem _Cloudflare account lock_) → còn lại Founder xóa Worker `cios-workers-api`, Pages `cios-iai-one`, D1 (đúng 3 tài nguyên, nhận diện bằng account + UUID)
- [ ] **Chặn deploy:** secret `CLOUDFLARE_API_TOKEN` không hợp lệ (run 42222397302, 2026-11-06) — tạo Cloudflare API token bền vững (Account → Workers Scripts: Edit, Cloudflare Pages: Edit; chỉ account `f3f9…`), cập nhật secret rồi `gh run rerun 42222397302 --failed`; sau đó xác nhận bằng `/v1/meta` `release.commit`, `version.json` `commit` và preflight CORS
- [ ] **Dev loop 2026-11-11 (PR draft từ nhánh `loop/cios-20261111`, chưa merge):** D0 sửa race realtime + test hermetic; D1 `npm run e2e:local` (94 ca, Worker thật + D1 local); D2 giới hạn body 413, audit stub `stubbed:true`, +2 test authz; D3/D4 CI (`e2e-local` là điều kiện deploy, `paths-ignore` docs, workflow `credential-health`); D5 `npm audit fix` (prod 0 lỗ hổng); D6 docs. Cần xem job `e2e-local` chạy lần đầu trên runner GitHub trước khi merge; mỗi merge = deploy (đang bị chặn bởi token CI). Báo cáo, patch và băm nằm ngoài repo (workspace `governance/evidence/audit-vong-3-cios-2026-11-11/`)
- [ ] Quyết chính sách (C3-04, C3-05): người tự đăng ký có quyền `operator` (ghi events, chạy simulations, query data trên workspace `demo` dùng chung); stub `simulations/run` và `governance/approvals` trả `approved:true` — chuyển 501 hay triển khai thật (R2)
- [ ] Gate local có thể đỏ 2/44 khi máy có Postgres chạy (race, C3-02); đã có bản sửa ở dev loop D0, CI GitHub không bị ảnh hưởng
- [ ] Cổng GO cho deploy: ruleset không đòi approval/check nên mọi PR merge (kể cả Dependabot #2, #3) đều deploy production — cân nhắc GitHub Environment `production` có required reviewer cho 2 job deploy, hoặc ruleset đòi ≥1 approval + required status check `build-test`; thay đổi chỉ-docs (STATUS, README) không nên kích hoạt deploy — cân nhắc `paths-ignore` cho push trigger
- [ ] GitHub báo 63 cảnh báo dependency trên `main` (1 critical, 29 high, 26 moderate, 7 low; 2026-11-06); PR Dependabot #2, #3 đang mở — chưa xử lý
- [ ] Dọn: 7 tệp ` 2` (iCloud) untracked trong checkout `cios.iai.one.fresh`; nhánh `release/r1-ci-cors-1ce53dd` đã merge; `docs/LOCAL_TO_CLOUDFLARE_DEPLOY_RUNBOOK.md:56` còn trỏ URL cũ `cios-workers-api.tranhatam66.workers.dev`
- [ ] Verify AIAgent với `AIAGENT_API_KEY` (R2)
- [ ] Stripe / Google OAuth / SSE (R2)
