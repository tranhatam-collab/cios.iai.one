# SOURCE GUARD — cios.iai.one

**Written:** 2026-05-16
**Written by:** Local Source Protection agent
**Risk level:** HIGH — unversioned production source

---

## CRITICAL: THIS FOLDER HAS NO GIT HISTORY

There is NO `.git` directory in this folder.
This source is **NOT versioned**.

If this folder is deleted, overwritten, or corrupted, the production source for `cios.iai.one` is GONE with no recovery path.

---

## PRODUCTION STATE

| Field | Value |
|---|---|
| CF Pages project | `cios-iai-one` |
| CF Account | 93112cc |
| Project name (wrangler.toml) | `cios-iai-one` |
| Build output dir | `site/` |
| Compatibility date | 2025-03-25 |
| Current status | RUNTIME_PASS |
| Package version | 1.1.0 |
| Package name | `cios.iai.one` |
| Description | Customer Intelligence OS backend foundation API |

Package.json declares a GitHub repository URL:
`https://github.com/tranhatam-collab/cios.iai.one`

**That remote may not exist or may be out of date — it is unverified as of 2026-05-16.**

---

## FOLDER SCOPE

This folder contains:
- Full backend API source (`src/`, `services/`, `hooks/`, `migrations/`, `scripts/`)
- Frontend site files (`site/`, `app/`, `dist/`)
- Tests (`tests/`)
- Database schema (`DATABASE_SCHEMA.sql`)
- Architecture and specification docs (multiple `.md` files)
- Node dependencies (`node_modules/`)
- Configuration files (`wrangler.toml`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`)

This is a substantial production codebase. Data loss here is not recoverable without a remote backup.

---

## DO NOT

- DO NOT delete this folder without Founder sign-off
- DO NOT overwrite source files without Founder sign-off
- DO NOT run `npm run deploy:pages` without verifying the content matches expected production state
- DO NOT run `git init` until Founder makes the decision below

---

## FOUNDER DECISION REQUIRED

Choose one of the following:

**Option A — Recommended: Version and push to GitHub**
1. `git init` in this folder
2. Create the repository `tranhatam-collab/cios.iai.one` on GitHub (if it does not already exist)
3. Push all source files to a `main` branch
4. Confirm push succeeded before proceeding with any other work
5. Add `.gitignore` entries for `node_modules/`, `dist/`, and any secrets

**Option B — Accept risk with regular backups**
1. Acknowledge this folder is unversioned and accept the risk
2. Set up a regular automated backup (e.g., zip archive to cloud storage on a schedule)
3. Document the backup schedule and last-backup date in this file

**Status of decision:** PENDING — awaiting Founder sign-off as of 2026-05-16

---

## LAST KNOWN WORKING STATE

Production `cios-iai-one` is currently RUNTIME_PASS as of 2026-05-16.
The contents of this local folder represent the last known source.
No verification has been done that this folder exactly matches the deployed production build.
