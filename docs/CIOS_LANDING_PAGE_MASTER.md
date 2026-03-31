# CIOS — Landing Page Master

**Conversion-first Landing Page (global standard)**

DEV + Design + Content có thể dùng trực tiếp để build.

**Tham chiếu:** `docs/CIOS_GLOBAL_PRODUCT_STRATEGY.md`, `docs/CIOS_FUTURE_LOCK_BIOS.md`, `docs/CIOS_MASTER_SPEC.md`.

---

## I. Triết lý landing page

Trang này **không** phải để “giới thiệu”. Trang này phải:

- khiến user **hiểu trong ~5 giây**
- khiến user **“bị đau” trong ~10 giây**
- khiến user **muốn thử trong ~30 giây**

---

## II. Structure tổng thể (không được sai)

Trang gồm **9 section** (đúng thứ tự):

1. Hero (hook mạnh)  
2. Reality Shock (đánh vào nỗi đau)  
3. What CIOS Does  
4. Live Demo / Interactive  
5. Core Features  
6. How It Works  
7. Proof / Trust  
8. Pricing  
9. Final CTA  

**Không thêm section ngoài danh sách** trừ khi product lead quyết định phiên bản khác — mặc định build đúng 9 section.

---

## III. Section 1 — Hero

### UI

- Full viewport (full screen feel)  
- Nền tối (dark)  
- Chữ lớn, phân cấp rõ  
- Animation nhẹ (không gây mất tập trung)  
- Không rối  

### Copy (khóa)

**Headline**

> Your business is not running.  
> It is drifting.

**Subheadline**

> CIOS shows you the truth,  
> predicts what will break,  
> and tells you what to do next.

**CTA (primary)**

- **See My Business Now**  
- **Run Free Analysis**  

*(Hai nút có thể cùng một hành động — scroll tới demo hoặc mở flow phân tích.)*

**Supporting line**

> No setup. No integration. Instant insight.

---

## IV. Section 2 — Reality Shock

**Mục tiêu:** làm user “nhói”.

### Copy

Most businesses don’t fail suddenly.  
They slowly break while nobody sees it.

- Revenue drops before you notice  
- Teams slow down before you react  
- Customers leave before you understand  

You don’t have a business problem.  
You have a **visibility problem**.

---

## V. Section 3 — What CIOS Does

### UI

3–4 **cards** ngang (desktop); stack trên mobile.

### Copy

**1. See Everything**  
One screen shows your entire business state.

**2. Detect Problems Early**  
Know what is breaking before it breaks.

**3. Decide Faster**  
Clear actions. Not dashboards.

**4. Act Instantly**  
Trigger workflows and fix issues immediately.

---

## VI. Section 4 — Live Demo (quan trọng nhất)

### UI

- Form nhỏ, ít field  
- Kết quả hiển thị gần realtime (hoặc perceived instant + skeleton)  

### Input

- Revenue  
- Team size  
- Industry  

### Output (bắt buộc hiển thị)

- **Business Health Score**  
- **Top 3 Risks**  
- **1 Hidden Problem**  
- **Suggested Action**  

### Copy

> Enter your business data.  
> See what you are missing.

---

## VII. Section 5 — Core Features

### UI

Grid **6 ô** (2×3 desktop; 1 cột mobile).

### Copy

| Feature | Copy |
|---------|------|
| **Business Reality Engine** | See the real state, not reports. |
| **Risk Radar** | Detect what will break next. |
| **Decision Engine** | Know what to do, not just what happened. |
| **Simulation** | Test before you act. |
| **Automation Orchestration** | Execute instantly via workflows. |
| **Memory System** | Never lose knowledge again. |

---

## VIII. Section 6 — How It Works

### UI

Step-by-step ngang (hoặc vertical trên mobile), có số bước rõ.

### Copy

**Step 1 — Connect Data**  
We read your systems or input manually.

**Step 2 — Analyze**  
CIOS builds your business model.

**Step 3 — Detect**  
We find hidden risks and patterns.

**Step 4 — Decide**  
You get clear actions.

**Step 5 — Execute**  
Trigger workflows instantly.

---

## IX. Section 7 — Proof / Trust

### UI

- Số liệu lớn (stats)  
- Testimonial (1 quote mạnh)  
- Logo (đối tác / early users — khi có dữ liệu thật)  

### Copy (placeholder metrics — thay bằng số thật khi launch)

- Businesses analyzed  
- Decisions generated  
- Risks detected  

**Quote**

> “This showed me problems I didn’t know existed.”

---

## X. Section 8 — Pricing

### UI

**3 cột** (Free | Pro | Enterprise).

### Copy

**Free**

- Basic insights  
- Daily report  

**Pro**

- Full system  
- Simulation  
- Automation  

**Enterprise**

- Custom AI  
- Governance  
- Full control  

*(Giá chi tiết đồng bộ `CIOS_GLOBAL_PRODUCT_STRATEGY.md`.)*

---

## XI. Section 9 — Final CTA

### Copy

You don’t need more tools.  
You need to see clearly.

**CTA**

> Start Free Analysis Now

---

## XII. UI wireframe (DEV + Design)

```text
TOP NAV
  Logo | Product | Pricing | Docs | Login

HERO
  left: headline + sub + CTA + supporting line
  right: animation / dashboard preview

REALITY SHOCK
  full width, text center, max-width readable

WHAT CIOS DOES
  3–4 cards row

CORE FEATURES
  grid 2×3

LIVE DEMO
  form (revenue, team, industry) + result panel

HOW IT WORKS
  horizontal steps (5)

PROOF / TRUST
  stats | quote | logos

PRICING
  3 cards

FINAL CTA
  one message + primary button

FOOTER
  links | social | legal
```

---

## XIII. UX quan trọng

1. **Không rối** — ít chữ, ít màu accent, ít animation.  
2. **Một message duy nhất:** *“Bạn đang không thấy vấn đề của mình.”*  
3. **Một CTA chính xuyên suốt:** **Run Analysis** / **Free Analysis** (cùng họ hành động).  
4. **Tốc độ:** load nhanh, không lag, **mobile-first**.

---

## XIV. Tâm lý convert

User đi qua vòng:

- *Mình ổn* → click thử  
- *Thấy vấn đề* → bị sốc  
- *Muốn biết thêm* → vào app / đăng ký  

---

## XV. Kết luận

Landing này phải:

- không giống SaaS generic  
- không dài dòng  
- không lý thuyết  

**Nó phải là:** một **cú đấm nhận thức**.

---

## XVI. Message cho DEV

Build **đúng structure** trên.  
**Không** thêm section tuỳ hứng.  
**Không** over-design.  
Ưu tiên: **speed**, **clarity**, **conversion**.

---

*Tài liệu landing: bám GTM Phase 1; demo output có thể rule-based / mock cho đến khi engine thật sẵn sàng — nhưng UX và thứ tự section không đổi.*
