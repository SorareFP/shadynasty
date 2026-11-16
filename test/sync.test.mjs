import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sync } from '../scripts/sync.mjs';
import { ApiError } from '../scripts/api.mjs';

const LEAGUE = 'cfb27-1';

function leagueDoc(over = {}) {
  return {
    id: LEAGUE, name: 'Test', currentSeason: 2037,
    stage: { key: 'k1', label: 'Week 3', year: 2037, phase: 'season', week: 3 },
    stageObservedAt: 100, seasons: [2037], ...over,
  };
}

function datasets(over = {}) {
  return {
    schedule: {
      state: 'available',
      weeks: [{ id: '1', label: 'Week 0', games: [] }],
      teams: [
        { teamId: 't1', name: 'Clemson', userControlled: true },
        { teamId: 't2', name: 'Texas', userControlled: true },
        { teamId: 't3', name: 'Duke', userControlled: false },
      ],
    },
    rankings: { weeks: [{ polls: [] }] },
    postseason: { state: 'pending', slots: [], championships: [{ year: 2036 }] },
    recruiting: { captures: [{ dataset: 'top_classes', classes: [] }] },
    coaches: { state: 'available', active: [{ name: 'A' }], retired: [] },
    awards: { state: 'available', winners: [{ award: 'Heisman' }] },
    ...over,
  };
}

function fakeClient({ league = leagueDoc(), data = datasets(), games = [], failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    async get(path) {
      calls.push(path);
      if (failOn && path.includes(failOn)) throw new ApiError('nope', 402);
      if (path === `/leagues/${LEAGUE}`) return { data: league };
      const m = path.match(/\/seasons\/[^/]+\/(.+)$/);
      const name = m[1];
      if (name.startsWith('rosters/')) return { data: { team: { teamId: name.slice(8) }, players: [{ playerId: 'p' }] } };
      return { season: league.currentSeason, data: data[name] };
    },
    async getAllBoxScores() {
      calls.push('box-scores');
      if (failOn === 'box-scores') throw new ApiError('nope', 500);
      return games;
    },
  };
}

async function tmp() { return mkdtemp(join(tmpdir(), 'sync-')); }
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

async function snapshot(dir) {
  const out = {};
  for (const e of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (e.isFile()) { const p = join(e.parentPath, e.name); out[p] = await readFile(p, 'utf8'); }
  }
  return out;
}

test('first run writes every dataset', async () => {
  const dir = await tmp();
  const res = await sync({ client: fakeClient({ games: [{ gameId: 'g1' }] }), league: LEAGUE, dataDir: dir });
  assert.deepEqual(res, { changed: true, season: 2037 });
  for (const f of ['schedule', 'box-scores', 'rankings', 'postseason', 'recruiting', 'coaches', 'awards']) {
    await readJson(join(dir, '2037', `${f}.json`));
  }
  assert.equal((await readJson(join(dir, 'league.json'))).stage.key, 'k1');
  assert.deepEqual((await readJson(join(dir, '2037', 'box-scores.json'))).games, [{ gameId: 'g1' }]);
});

test('roster team ids default to the userControlled schedule teams', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  assert.deepEqual((await readdir(join(dir, '2037', 'rosters'))).sort(), ['t1.json', 't2.json']);
});

test('unchanged stage makes one request and writes nothing', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const before = await snapshot(dir);
  const c = fakeClient();
  const res = await sync({ client: c, league: LEAGUE, dataDir: dir });
  assert.equal(res.changed, false);
  assert.equal(c.calls.length, 1);
  assert.deepEqual(await snapshot(dir), before);
});

test('changed stageObservedAt triggers a refresh', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const res = await sync({ client: fakeClient({ league: leagueDoc({ stageObservedAt: 200 }) }), league: LEAGUE, dataDir: dir });
  assert.equal(res.changed, true);
});

test('box scores merge by gameId', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient({ games: [{ gameId: 'A', v: 1 }, { gameId: 'B', v: 1 }] }), league: LEAGUE, dataDir: dir });
  await sync({
    client: fakeClient({ league: leagueDoc({ stageObservedAt: 200 }), games: [{ gameId: 'B', v: 2 }, { gameId: 'C', v: 1 }] }),
    league: LEAGUE, dataDir: dir,
  });
  const games = (await readJson(join(dir, '2037', 'box-scores.json'))).games;
  assert.deepEqual(games.map((g) => `${g.gameId}${g.v}`).sort(), ['A1', 'B2', 'C1']);
});

test('empty or unavailable dataset does not overwrite', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  await sync({
    client: fakeClient({
      league: leagueDoc({ stageObservedAt: 200 }),
      data: datasets({
        schedule: { state: 'unavailable', weeks: [], teams: [] },
        awards: { state: 'pending', winners: [] },
        recruiting: { captures: [] },
      }),
    }),
    league: LEAGUE, dataDir: dir,
  });
  assert.equal((await readJson(join(dir, '2037', 'schedule.json'))).weeks.length, 1);
  assert.equal((await readJson(join(dir, '2037', 'awards.json'))).winners.length, 1);
  assert.equal((await readJson(join(dir, '2037', 'recruiting.json'))).captures.length, 1);
});

test('ApiError mid-run leaves the archive byte-identical', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  const before = await snapshot(dir);
  await assert.rejects(
    sync({ client: fakeClient({ league: leagueDoc({ stageObservedAt: 200 }), failOn: 'coaches' }), league: LEAGUE, dataDir: dir }),
    ApiError,
  );
  assert.deepEqual(await snapshot(dir), before);
});

test('season rollover writes a new season folder and keeps the old one', async () => {
  const dir = await tmp();
  await sync({ client: fakeClient(), league: LEAGUE, dataDir: dir });
  await sync({
    client: fakeClient({ league: leagueDoc({ currentSeason: 2038, stageObservedAt: 300, stage: { key: 'k9', year: 2038 } }) }),
    league: LEAGUE, dataDir: dir,
  });
  await readJson(join(dir, '2037', 'schedule.json'));
  await readJson(join(dir, '2038', 'schedule.json'));
});

test('backfills awards for past seasons that have none archived', async () => {
  const dir = await tmp();
  const c = fakeClient({ league: leagueDoc({ seasons: [2037, 2036, 2035] }) });
  await sync({ client: c, league: LEAGUE, dataDir: dir });
  assert.ok(c.calls.includes(`/leagues/${LEAGUE}/seasons/2036/awards`));
  assert.equal((await readJson(join(dir, '2036', 'awards.json'))).winners.length, 1);
  assert.equal((await readJson(join(dir, '2035', 'awards.json'))).winners.length, 1);
  const c2 = fakeClient({ league: leagueDoc({ seasons: [2037, 2036, 2035], stageObservedAt: 200 }) });
  await sync({ client: c2, league: LEAGUE, dataDir: dir });
  assert.ok(!c2.calls.includes(`/leagues/${LEAGUE}/seasons/2036/awards`), 'archived past awards are not refetched');
});
