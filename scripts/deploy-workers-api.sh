#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="${ROOT_DIR}/services/api"

echo "==> CIOS Workers API deploy"
echo "    Root: ${ROOT_DIR}"
echo "    API:  ${API_DIR}"

if [ ! -f "${API_DIR}/wrangler.toml" ]; then
  echo "ERROR: missing ${API_DIR}/wrangler.toml" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found" >&2
  exit 1
fi

cd "${API_DIR}"

if [ ! -d node_modules/wrangler ]; then
  echo "==> Installing services/api dependencies"
  npm install
fi

echo ""
echo "==> Pre-deploy checklist"
echo "  1. JWT_SECRET must be set on the worker:"
echo "       cd services/api && npx wrangler secret put JWT_SECRET"
echo "  2. Optional demo password override:"
echo "       npx wrangler secret put AUTH_DEMO_PASSWORD"
echo "  3. Default API URL (frontend): https://cios-workers-api.tranhatam.workers.dev"
echo ""

if [ "${SKIP_DEPLOY:-}" = "1" ]; then
  echo "SKIP_DEPLOY=1 — dry run only."
  npx wrangler deploy --dry-run
  exit 0
fi

npx wrangler deploy

echo ""
echo "==> Post-deploy smoke (no JWT required)"
/usr/bin/curl -sS "https://cios-workers-api.tranhatam.workers.dev/v1/system/health" || true
echo ""
/usr/bin/curl -sS "https://cios-workers-api.tranhatam.workers.dev/v1/meta" || true
echo ""
echo "Done. Run auth smoke after JWT_SECRET is configured:"
echo "  JWT_SECRET=... WORKERS_API_URL=https://cios-workers-api.tranhatam.workers.dev npm run smoke:workers:strict"
