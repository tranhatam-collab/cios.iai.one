import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const payload = {
  name: pkg.name,
  version: pkg.version,
  apiCompat: "v1",
  generatedAt: new Date().toISOString(),
  policy: "each_release_is_a_complete_superset"
};

writeFileSync(resolve(root, "site", "version.json"), JSON.stringify(payload, null, 2) + "\n", "utf8");
