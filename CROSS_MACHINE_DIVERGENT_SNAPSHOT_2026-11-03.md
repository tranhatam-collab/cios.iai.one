# CIOS divergent local snapshot receipt

Date: 2026-11-03

## Verdict

`PARTIAL_AUDIT_ONLY`. This branch preserves readable bytes from a local CIOS checkout whose commit ancestry cannot be mapped to the canonical remote. The files are stored only under `recovery/local-readable/`; none of them replaces or enters the runtime source tree.

## Source identities

- Canonical remote: `git@github.com:tranhatam-collab/cios.iai.one.git`
- Canonical remote base: `c0b350f1c04b930bd326b8ee4e19ed220c25b022`
- Local checkout: `/Users/tranhatam/Documents/Devnewproject/cios.iai.one`
- Local reported HEAD: `1b153d976c672705bd91095f12fbac2f5d0a4c80`
- Snapshot branch: `OMCODE/local-divergent-snapshot-20261103`
- Local HEAD relation to remote: `UNVERIFIED`; the local commit/tree could not be read reliably and the object is not present in the canonical remote history.

## Preserved evidence

- Readable local files preserved: 31
- Exact SHA-256 matches between local source and `recovery/local-readable/`: 31/31
- Raw credential-pattern matches: 0
- Runtime files modified by this branch: 0

Preserved paths:

```text
STATUS.md
tests/setup.ts
README.md
tsconfig.test.json
package.json
scripts/smoke-workers-e2e.sh
.github/workflows/ci.yml
site/version.json
site/index.html
site/app/settings/index.html
site/app/index.html
site/app/signals/index.html
site/app/audit/index.html
site/app/accounts/index.html
site/app/accounts/detail.html
site/app/priorities/index.html
site/app/import/index.html
site/js/app-shell.js
site/register/index.html
.env.example
eslint.config.mjs
services/api/wrangler.toml
services/api/src/lib/session-auth.ts
services/api/src/lib/signature.ts
services/api/src/lib/jwt-sign.ts
services/api/src/lib/cors.ts
services/api/src/lib/persistence.ts
services/api/src/lib/auth.ts
services/api/src/worker.ts
src/scripts/seed-demo.ts
src/interfaces/http/routes/v1/payment.routes.ts
```

## Missing from the local checkout

The following 13 canonical remote paths were not available in the local checkout and are not reconstructed:

```text
services/api/src/lib/product-store.ts
site/404.html
site/_headers
site/app/actions/index.html
site/js/app.js
site/login/index.html
site/robots.txt
src/repositories/member.repository.ts
src/scripts/run-migrations.ts
tests/sprint-v1.test.ts
tests/v1-meta.test.ts
tests/workers-r1-contract.test.ts
vitest.config.ts
```

## Gates not claimed

- Canonical remote base verification: `npm ci` PASS; `npm run typecheck` PASS; `npm run build` PASS; full Vitest suite 42/42 PASS; focused Worker R1 contract suite 10/10 PASS.
- The focused suite includes registration tests proving caller-supplied `role:admin` and workspace selection are ignored by current source.
- `npm ci` reported 26 dependency vulnerabilities: 1 critical, 9 high, 15 moderate, and 1 low. This remains a release blocker requiring dependency review.
- No build or test result is claimed for the divergent snapshot itself because it is intentionally not applied to runtime paths.
- No deployment, Cloudflare Worker mutation, DNS mutation, secret mutation, or database mutation was performed.
- The current canonical `main` source contains remediations for the two previously reported auth risks: registration ignores caller-supplied role/workspace values, and demo seeding requires both `ALLOW_DEMO_SEED=true` and `AUTH_DEMO_PASSWORD`. Source evidence alone does not prove the live Worker is running this exact SHA or has safe secret values.
- This branch is not a release candidate. It is evidence for cross-machine audit and possible manual reconciliation only.
