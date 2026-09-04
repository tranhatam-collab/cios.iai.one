// Run with node --test explicitly; keep separate from the Vitest suite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSmokeEnvironment } from './smoke-workers-preflight.mjs';

const fixture = { JWT_SECRET: 'local-test-not-a-live-secret', WORKERS_API_URL: 'https://staging-api.example.test', WORKERS_SMOKE_ENVIRONMENT: 'staging', WORKERS_SMOKE_WRITE_ACK: 'STAGING_ONLY' };
test('missing staging key cannot create a false-green smoke', () => assert.throws(() => validateSmokeEnvironment({ ...fixture, JWT_SECRET: '' }), /missing/));
test('missing staging URL does not fall back to production', () => assert.throws(() => validateSmokeEnvironment({ ...fixture, WORKERS_API_URL: '' }), /required/));
test('production origin is denied before network requests', () => assert.throws(() => validateSmokeEnvironment({ ...fixture, WORKERS_API_URL: 'https://cios-workers-api.tranhatam.workers.dev' }), /forbidden/));
test('write acknowledgement and environment are mandatory', () => {
  assert.throws(() => validateSmokeEnvironment({ ...fixture, WORKERS_SMOKE_WRITE_ACK: '' }), /acknowledgement/);
  assert.throws(() => validateSmokeEnvironment({ ...fixture, WORKERS_SMOKE_ENVIRONMENT: 'production' }), /staging/);
});
test('credential-bearing URL is rejected', () => assert.throws(() => validateSmokeEnvironment({ ...fixture, WORKERS_API_URL: 'https://user:pass@staging.example.test' }), /credentials/));
test('complete staging configuration passes preflight only, not runtime E2E', () => assert.equal(validateSmokeEnvironment(fixture).environment, 'staging'));
