# Customer Intelligence OS API

Backend foundation for the Customer Intelligence OS platform.

Repository: [github.com/tranhatam-collab/cios.iai.one](https://github.com/tranhatam-collab/cios.iai.one)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

Edit `.env` (database, secrets, and `CLOUDFLARE_ACCOUNT_ID` if you use Wrangler with multiple accounts).

3. Start in development mode:

```bash
npm run dev
```

## Useful scripts

- `npm run dev`: start API in watch mode
- `npm run build`: compile TypeScript to `dist`
- `npm run typecheck`: run TypeScript type checks
- `npm test`: run Vitest
- `npm run db:migrate`: run SQL migrations in `migrations/`
- `npm run sync:site-version`: write `site/version.json` from `package.json`
- `npm run deploy:pages`: deploy the static `site/` folder to Cloudflare Pages (runs `sync:site-version` first; requires Wrangler login and `CLOUDFLARE_ACCOUNT_ID` in `.env` when multiple accounts exist)

## API versioning (semantic, monotonic)

- **Package & API** follow **semver** in `package.json`. Public REST surface is namespaced under **`/v1`**; breaking HTTP changes ship as **`/v2`** later, not silent breaks.
- **Policy:** each tagged release is expected to be a **complete superset** of the previous one for supported clients (new capabilities additive; deprecations documented).
- **Discovery:** `GET /v1/meta` — version, optional git SHA (`GITHUB_SHA` / `CI_COMMIT_SHA`), `apiCompat`, and capability flags for clients (web / future mobile).
- **Headers** on all responses: `X-App-Version` (semver), `X-API-Compat` (`v1`).

## Health endpoints

- `GET /health`
- `GET /health/db` (requires PostgreSQL reachable via `DATABASE_URL`)

## Cloudflare Pages (static shell)

The `site/` directory is a **responsive, mobile-style shell** (safe areas, 44px touch targets, bottom nav) with **PWA manifest** and a small **`/js/app.js` feature registry** (`window.CIOS`) so new UI modules can mount without rewriting the shell — aligned with a future native wrapper (e.g. Capacitor / React Native WebView).

`npm run sync:site-version` writes `site/version.json` from `package.json` (also run automatically before `npm run deploy:pages` and in CI before Pages upload).

Production URL:

- [https://cios-iai-one.pages.dev](https://cios-iai-one.pages.dev)

The API itself runs as a Node process (not on Pages). Use your own host or container platform for `npm start` and point DNS or a reverse proxy as needed.

### GitHub Actions: auto deploy on push

On `main` and `dev`, CI runs typecheck, build, and tests. After a green CI run, the workflow deploys `site/` to Cloudflare Pages.

Add repository secret **CLOUDFLARE_API_TOKEN** with:

- Cloudflare API token permissions: **Account** → **Cloudflare Pages** → **Edit** (and any other scopes your org requires for Wrangler).

Without this secret, the deploy job fails until the token is configured.

You can also run the workflow manually: **Actions → CI → Run workflow**.

### Custom domain (gắn khi nào?)

- **Dev / test / CI xanh**: dùng URL có sẵn `https://cios-iai-one.pages.dev` là đủ, **không cần** gắn domain riêng.
- **Khi cần gắn domain** (ví dụ `cios.iai.one` hoặc `api.*`): khi bạn muốn thương hiệu, DNS riêng, hoặc TLS theo hostname tùy chọn. Lúc đó vào Cloudflare Dashboard → **Workers & Pages** → project **cios-iai-one** → **Custom domains** → thêm zone/DNS theo hướng dẫn. **Báo mình khi bạn chọn tên miền cụ thể** để cấu hình DNS/CNAME đúng (thường CNAME tới `cios-iai-one.pages.dev` hoặc bản ghi Cloudflare chỉ định).
