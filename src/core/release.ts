import { readFileSync } from "node:fs";
import path from "node:path";

import type { PackageJson } from "../types/package-json.js";

const API_COMPAT = "v1" as const;

let cached: ReleaseInfo | null = null;

export type ReleaseInfo = {
  name: string;
  version: string;
  apiCompat: typeof API_COMPAT;
  commit: string | null;
  environment: string;
};

function readPackageJson(): PackageJson {
  const cwd = process.cwd();
  const raw = readFileSync(path.join(cwd, "package.json"), "utf8");
  return JSON.parse(raw) as PackageJson;
}

export function getReleaseInfo(): ReleaseInfo {
  if (cached) {
    return cached;
  }
  const pkg = readPackageJson();
  const commit =
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.CI_COMMIT_SHA ??
    process.env.GIT_COMMIT ??
    null;

  cached = {
    name: pkg.name,
    version: pkg.version,
    apiCompat: API_COMPAT,
    commit: commit ? commit.slice(0, 7) : null,
    environment: process.env.NODE_ENV ?? "development"
  };

  return cached;
}

export function getApiCompat(): typeof API_COMPAT {
  return API_COMPAT;
}
