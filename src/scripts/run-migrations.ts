import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dbPool } from "../bootstrap/db.js";
import { logger } from "../bootstrap/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../migrations");

async function runMigrations() {
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const filename of files) {
    const existing = await dbPool.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [filename]);
    if (existing.rowCount) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    await dbPool.query("BEGIN");
    try {
      await dbPool.query(sql);
      await dbPool.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [filename]);
      await dbPool.query("COMMIT");
      logger.info({ filename }, "migration applied");
    } catch (error) {
      await dbPool.query("ROLLBACK");
      throw error;
    }
  }

  logger.info("all migrations complete");
}

runMigrations()
  .catch((error) => {
    logger.error({ error }, "migration failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await dbPool.end();
  });
