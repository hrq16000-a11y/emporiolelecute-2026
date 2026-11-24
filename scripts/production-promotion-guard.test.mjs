import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// Supply the command read back from Vercel, not an assumed local copy.
const command = process.env.PRODUCTION_IGNORE_COMMAND;
assert.ok(command, 'Verified provider ignored-build command required');

test('production checkpoints are ignored rather than built', () => {
 const result = spawnSync('bash', ['-c', command], { env: { VERCEL_ENV: 'production' } });
 assert.equal(result.status, 0);
});

test('the production-only command preserves the separate preview build path', () => {
 const result = spawnSync('bash', ['-c', command], { env: { VERCEL_ENV: 'preview' } });
 assert.equal(result.status, 1);
});