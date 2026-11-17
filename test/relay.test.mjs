import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifySignature, handle } from '../relay/worker.mjs';

const SECRET = 'whsec_test_secret';
const NOW = 1794900000;
const sign = (body, t = NOW, secret = SECRET) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const ENV = { DR_WEBHOOK_SECRET: SECRET, GITHUB_TOKEN: 'gh-test-token' };

function delivery(body, headers = {}) {
  return new Request('https://relay.example/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-DR-Dataset': 'schedule', ...headers },
    body,
  });
}

function fakeGitHub(status = 204) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(null, { status });
  };
  return { calls, fetchImpl };
}

test('accepts a correct, recent signature', async () => {
  const body = '{"type":"dataset.updated"}';
  assert.equal(await verifySignature(body, sign(body), SECRET, NOW), true);
  assert.equal(await verifySignature(body, sign(body), SECRET, NOW + 299), true);
});

test('rejects a wrong secret, a changed body, an old timestamp and junk headers', async () => {
  const body = '{"type":"dataset.updated"}';
  assert.equal(await verifySignature(body, sign(body, NOW, 'whsec_other'), SECRET, NOW), false);
  assert.equal(await verifySignature(body + ' ', sign(body), SECRET, NOW), false);
  assert.equal(await verifySignature(body, sign(body), SECRET, NOW + 301), false);
  assert.equal(await verifySignature(body, 'nonsense', SECRET, NOW), false);
  assert.equal(await verifySignature(body, null, SECRET, NOW), false);
  assert.equal(await verifySignature(body, sign(body), '', NOW), false);
});

test('a signed delivery asks GitHub to rebuild', async () => {
  const body = '{"dataset":"rosters"}';
  const gh = fakeGitHub();
  const res = await handle(delivery(body, { 'X-DR-Signature': sign(body), 'X-DR-Dataset': 'rosters' }), ENV, gh.fetchImpl, NOW);
  assert.equal(res.status, 202);
  assert.equal(gh.calls.length, 1);
  assert.equal(gh.calls[0].url, 'https://api.github.com/repos/SorareFP/shadynasty/dispatches');
  assert.equal(gh.calls[0].init.headers.Authorization, 'Bearer gh-test-token');
  assert.deepEqual(gh.calls[0].body, { event_type: 'dynasty-updated', client_payload: { dataset: 'rosters', test: false } });
});

test('a test delivery also rebuilds and is marked as a test', async () => {
  const body = '{"test":true}';
  const gh = fakeGitHub();
  const res = await handle(delivery(body, { 'X-DR-Signature': sign(body), 'X-DR-Test': 'true' }), ENV, gh.fetchImpl, NOW);
  assert.equal(res.status, 202);
  assert.equal(gh.calls[0].body.client_payload.test, true);
});

test('a bad signature is refused without calling GitHub', async () => {
  const gh = fakeGitHub();
  const res = await handle(delivery('{}', { 'X-DR-Signature': sign('{"other":1}') }), ENV, gh.fetchImpl, NOW);
  assert.equal(res.status, 401);
  assert.equal(gh.calls.length, 0);
});

test('GitHub refusing the rebuild makes Dynasty Rewired retry', async () => {
  const body = '{}';
  const res = await handle(delivery(body, { 'X-DR-Signature': sign(body) }), ENV, fakeGitHub(401).fetchImpl, NOW);
  assert.equal(res.status, 502);
  const down = async () => { throw new Error('network'); };
  const res2 = await handle(delivery(body, { 'X-DR-Signature': sign(body) }), ENV, down, NOW);
  assert.equal(res2.status, 502);
});

test('missing secrets and non-POST requests are refused', async () => {
  const gh = fakeGitHub();
  assert.equal((await handle(new Request('https://relay.example/'), ENV, gh.fetchImpl, NOW)).status, 405);
  const body = '{}';
  const res = await handle(delivery(body, { 'X-DR-Signature': sign(body) }), { GITHUB_TOKEN: 'x' }, gh.fetchImpl, NOW);
  assert.equal(res.status, 500);
  assert.equal(gh.calls.length, 0);
});

test('the workflow starts on relay calls and does a full refresh for them', async () => {
  const wf = await readFile(new URL('../.github/workflows/update.yml', import.meta.url), 'utf8');
  assert.match(wf, /repository_dispatch:\s*\n\s*types: \[dynasty-updated\]/);
  assert.match(wf, /FORCE_SYNC: .*github\.event_name == 'repository_dispatch'/);
});
