import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, ApiError } from '../scripts/api.mjs';

function fakeFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    const r = responses.shift();
    return {
      ok: r.status === undefined || (r.status >= 200 && r.status < 300),
      status: r.status ?? 200,
      json: async () => r.body,
    };
  };
  return { impl, calls };
}

test('sends bearer token', async () => {
  const f = fakeFetch([{ body: { data: [] } }]);
  const client = createClient({ token: 'drk_test', fetchImpl: f.impl });
  await client.get('/leagues');
  assert.equal(f.calls[0].init.headers.authorization, 'Bearer drk_test');
  assert.equal(f.calls[0].url, 'https://dynastyrewired.com/api/developer/v1/leagues');
});

test('throws ApiError with status on 402', async () => {
  const f = fakeFetch([{ status: 402, body: { error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Subscribe' } } }]);
  const client = createClient({ token: 'drk_test', fetchImpl: f.impl });
  await assert.rejects(client.get('/leagues'), (e) => e instanceof ApiError && e.status === 402);
});

test('error message never contains the token', async () => {
  const f = fakeFetch([{ status: 401, body: { error: { message: 'bad token drk_secret123' } } }]);
  const client = createClient({ token: 'drk_secret123', fetchImpl: f.impl });
  await assert.rejects(client.get('/leagues'), (e) => !e.message.includes('drk_secret123'));
});

test('network failure becomes ApiError without the token', async () => {
  const client = createClient({ token: 'drk_secret123', fetchImpl: async () => { throw new Error('boom drk_secret123'); } });
  await assert.rejects(client.get('/leagues'), (e) => e instanceof ApiError && !e.message.includes('drk_secret123'));
});

test('getAllBoxScores follows next cursor', async () => {
  const f = fakeFetch([
    { body: { data: { games: [{ gameId: 'a' }], next: 'c1' } } },
    { body: { data: { games: [{ gameId: 'b' }], next: null } } },
  ]);
  const client = createClient({ token: 'drk_test', fetchImpl: f.impl });
  const games = await client.getAllBoxScores('cfb27-1', 2037);
  assert.deepEqual(games.map((g) => g.gameId), ['a', 'b']);
  assert.ok(!f.calls[0].url.includes('after='));
  assert.ok(f.calls[1].url.includes('after=c1'));
});
