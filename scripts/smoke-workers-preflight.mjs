import { pathToFileURL } from 'node:url';

export function validateSmokeEnvironment(env) {
  if (!env.JWT_SECRET?.trim()) throw new Error('SMOKE_WORKERS_JWT_SECRET / JWT_SECRET is missing');
  if (env.WORKERS_SMOKE_ENVIRONMENT !== 'staging') throw new Error('Write-capable smoke requires isolated staging');
  if (env.WORKERS_SMOKE_WRITE_ACK !== 'STAGING_ONLY') throw new Error('Missing explicit staging write acknowledgement');
  if (!env.WORKERS_API_URL) throw new Error('WORKERS_API_URL is required; no production default');
  const url = new URL(env.WORKERS_API_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Staging API must be an HTTPS origin without credentials, path or query');
  }
  if (['cios-workers-api.tranhatam.workers.dev', 'cios.iai.one', 'api.cios.iai.one', 'cios-api.fly.dev'].includes(url.hostname)) {
    throw new Error('Production/legacy origin is forbidden for write-capable smoke');
  }
  return { environment: 'staging', origin: url.origin };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { validateSmokeEnvironment(process.env); }
  catch (error) { console.error(`BLOCKED: ${error.message}`); process.exitCode = 2; }
}
