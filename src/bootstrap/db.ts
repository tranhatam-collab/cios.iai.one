import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: env.DATABASE_URL
});

export async function checkDbHealth(): Promise<boolean> {
  const result = await dbPool.query("SELECT 1 AS ok");
  return result.rows[0]?.ok === 1;
}
